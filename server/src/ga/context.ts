/**
 * Builds the immutable, index-based problem instance the GA operates on.
 *
 * Everything the algorithm needs is flattened into contiguous arrays and bitsets keyed by
 * integer index. The reason is performance: the fitness function runs
 * populationSize x maxGenerations times (100 x 1000 = 100,000 evaluations for the NFR1
 * benchmark), so it must never touch the database, allocate objects, or perform a string
 * comparison. Object ids are translated to array indices exactly once, here.
 */
import { DAYS, PERIODS_PER_DAY, SLOTS_PER_WEEK } from '@schedular/shared';
import type { SessionType } from '@schedular/shared';
import type { SessionRequirement } from './types';

export interface RawCourse {
  id: string;
  code: string;
  name: string;
  lecturesPerWeek: number;
  labsPerWeek: number;
  type: 'LECTURE' | 'LAB';
}

export interface RawInstructor {
  id: string;
  name: string;
  qualifiedCourseIds: string[];
  /** MeetingTime ids the instructor is available for. */
  availableSlotIds: string[];
}

export interface RawRoom {
  id: string;
  number: string;
  capacity: number;
  type: 'LECTURE_HALL' | 'LAB';
}

export interface RawBatch {
  id: string;
  label: string;
  studentCount: number;
  courseIds: string[];
}

export interface RawMeetingTime {
  id: string;
  day: string;
  period: number;
}

export interface RawInput {
  courses: RawCourse[];
  instructors: RawInstructor[];
  rooms: RawRoom[];
  batches: RawBatch[];
  meetingTimes: RawMeetingTime[];
}

export class ProblemContext {
  readonly courses: RawCourse[];
  readonly instructors: RawInstructor[];
  readonly rooms: RawRoom[];
  readonly batches: RawBatch[];
  readonly meetingTimes: RawMeetingTime[];

  /** slotIndex -> meetingTime array index, and the inverse. */
  readonly slotToMeetingTime: Int32Array;
  readonly meetingTimeToSlot: Int32Array;

  /** instructorIndex * SLOTS_PER_WEEK + slot -> 1 when the instructor is available. */
  readonly availability: Uint8Array;
  /** instructorIndex * courseCount + courseIndex -> 1 when qualified. */
  readonly qualification: Uint8Array;

  readonly requirements: SessionRequirement[];
  /** Total periods occupied across all requirements (labs count twice). */
  readonly totalPeriods: number;

  readonly slotCount = SLOTS_PER_WEEK;
  readonly periodsPerDay = PERIODS_PER_DAY;

  constructor(input: RawInput) {
    this.courses = input.courses;
    this.instructors = input.instructors;
    this.rooms = input.rooms;
    this.batches = input.batches;

    // Order meeting times canonically by (day, period) so slotIndex arithmetic
    // -- dayIndex * 6 + (period - 1) -- is meaningful and consecutive periods are adjacent.
    this.meetingTimes = [...input.meetingTimes].sort((a, b) => {
      const d = DAYS.indexOf(a.day as never) - DAYS.indexOf(b.day as never);
      return d !== 0 ? d : a.period - b.period;
    });

    this.slotToMeetingTime = new Int32Array(SLOTS_PER_WEEK).fill(-1);
    this.meetingTimeToSlot = new Int32Array(this.meetingTimes.length).fill(-1);
    const meetingTimeIndexById = new Map<string, number>();

    this.meetingTimes.forEach((mt, i) => {
      meetingTimeIndexById.set(mt.id, i);
      const slot = DAYS.indexOf(mt.day as never) * PERIODS_PER_DAY + (mt.period - 1);
      this.slotToMeetingTime[slot] = i;
      this.meetingTimeToSlot[i] = slot;
    });

    const courseIndexById = new Map(this.courses.map((c, i) => [c.id, i]));

    // --- Availability bitset (hard constraint: instructor must be free) ---
    this.availability = new Uint8Array(this.instructors.length * SLOTS_PER_WEEK);
    this.instructors.forEach((ins, ii) => {
      for (const mtId of ins.availableSlotIds) {
        const mtIndex = meetingTimeIndexById.get(mtId);
        if (mtIndex === undefined) continue;
        this.availability[ii * SLOTS_PER_WEEK + this.meetingTimeToSlot[mtIndex]] = 1;
      }
    });

    // --- Qualification bitset (hard constraint: instructor must teach the subject) ---
    this.qualification = new Uint8Array(this.instructors.length * this.courses.length);
    this.instructors.forEach((ins, ii) => {
      for (const cid of ins.qualifiedCourseIds) {
        const ci = courseIndexById.get(cid);
        if (ci !== undefined) this.qualification[ii * this.courses.length + ci] = 1;
      }
    });

    this.requirements = this.buildRequirements(courseIndexById);
    this.totalPeriods = this.requirements.reduce((sum, r) => sum + r.duration, 0);
  }

  /**
   * Session expansion, proposal section 4.3.2 Step 1: "if a course requires three lectures
   * per week, three separate genes are created for that course".
   *
   * A lab is one session of duration 2, not two independent sessions -- representing it as
   * a single gene with a duration is what keeps its two periods contiguous under crossover
   * and mutation without any repair pass.
   */
  private buildRequirements(courseIndexById: Map<string, number>): SessionRequirement[] {
    const requirements: SessionRequirement[] = [];

    this.batches.forEach((batch, batchIndex) => {
      for (const courseId of batch.courseIds) {
        const courseIndex = courseIndexById.get(courseId);
        if (courseIndex === undefined) continue;
        const course = this.courses[courseIndex];

        const add = (sessionType: SessionType, duration: number, ordinal: number) => {
          requirements.push({
            index: requirements.length,
            courseIndex,
            batchIndex,
            sessionType,
            duration,
            eligibleInstructors: this.eligibleInstructorsFor(courseIndex),
            eligibleRooms: this.eligibleRoomsFor(sessionType, batch.studentCount),
            eligibleStartSlots: this.eligibleStartSlotsFor(duration),
            sessionGroupId: `${batch.id}:${course.code}:${sessionType}:${ordinal}`,
          });
        };

        for (let n = 0; n < course.lecturesPerWeek; n++) add('LECTURE', 1, n);
        for (let n = 0; n < course.labsPerWeek; n++) add('LAB', 2, n);
      }
    });

    return requirements;
  }

  private eligibleInstructorsFor(courseIndex: number): number[] {
    const out: number[] = [];
    for (let ii = 0; ii < this.instructors.length; ii++) {
      if (this.qualification[ii * this.courses.length + courseIndex]) out.push(ii);
    }
    return out;
  }

  /**
   * Rooms of the right kind and large enough. Pre-filtering here means the initial
   * population starts free of capacity and room-type violations, so the GA spends its
   * generations on the genuinely hard part -- the timetabling conflicts -- rather than
   * rediscovering that a lab needs a lab room.
   */
  private eligibleRoomsFor(sessionType: SessionType, studentCount: number): number[] {
    const out: number[] = [];
    this.rooms.forEach((room, ri) => {
      const typeOk = sessionType === 'LAB' ? room.type === 'LAB' : true;
      if (typeOk && room.capacity >= studentCount) out.push(ri);
    });
    return out;
  }

  /** A duration-2 session cannot start in the last period of a day. */
  private eligibleStartSlotsFor(duration: number): number[] {
    const out: number[] = [];
    for (let slot = 0; slot < SLOTS_PER_WEEK; slot++) {
      if (this.slotToMeetingTime[slot] < 0) continue;
      const period = slot % PERIODS_PER_DAY;
      if (period + duration > PERIODS_PER_DAY) continue;
      // Every period the session spans must be a real, registered slot.
      let ok = true;
      for (let d = 0; d < duration; d++) {
        if (this.slotToMeetingTime[slot + d] < 0) ok = false;
      }
      if (ok) out.push(slot);
    }
    return out;
  }

  isAvailable(instructorIndex: number, slot: number): boolean {
    return this.availability[instructorIndex * SLOTS_PER_WEEK + slot] === 1;
  }

  isQualified(instructorIndex: number, courseIndex: number): boolean {
    return this.qualification[instructorIndex * this.courses.length + courseIndex] === 1;
  }
}
