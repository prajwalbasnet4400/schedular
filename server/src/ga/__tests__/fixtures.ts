/**
 * Synthetic problem instances for the GA unit tests.
 *
 * These are deliberately hand-sized rather than loaded from the database: a test that
 * needs PostgreSQL running is a test nobody runs, and the algorithm's correctness has
 * nothing to do with where its input came from.
 */
import { ProblemContext } from '../context';
import type { RawInput } from '../context';
import { DAYS, PERIODS_PER_DAY } from '@schedular/shared';

export function buildMeetingTimes() {
  const meetingTimes = [];
  for (const day of DAYS) {
    for (let period = 1; period <= PERIODS_PER_DAY; period++) {
      meetingTimes.push({ id: `mt-${day}-${period}`, day, period });
    }
  }
  return meetingTimes;
}

export const ALL_SLOT_IDS = buildMeetingTimes().map((m) => m.id);

/**
 * A small but genuinely constrained instance: 2 batches, 2 courses each, 2 rooms,
 * 2 instructors. Solvable, but only if the algorithm actually resolves clashes.
 */
export function tinyInput(overrides: Partial<RawInput> = {}): RawInput {
  const base: RawInput = {
    courses: [
      { id: 'c1', code: 'C1', name: 'Course One', lecturesPerWeek: 2, labsPerWeek: 0, type: 'LECTURE' },
      { id: 'c2', code: 'C2', name: 'Course Two', lecturesPerWeek: 2, labsPerWeek: 0, type: 'LECTURE' },
    ],
    instructors: [
      { id: 'i1', name: 'Instructor One', qualifiedCourseIds: ['c1', 'c2'], availableSlotIds: ALL_SLOT_IDS },
      { id: 'i2', name: 'Instructor Two', qualifiedCourseIds: ['c1', 'c2'], availableSlotIds: ALL_SLOT_IDS },
    ],
    rooms: [
      { id: 'r1', number: 'R1', capacity: 60, type: 'LECTURE_HALL' },
      { id: 'r2', number: 'R2', capacity: 60, type: 'LECTURE_HALL' },
    ],
    batches: [
      { id: 'b1', label: 'Batch One', studentCount: 30, courseIds: ['c1', 'c2'] },
      { id: 'b2', label: 'Batch Two', studentCount: 30, courseIds: ['c1', 'c2'] },
    ],
    meetingTimes: buildMeetingTimes(),
  };
  return { ...base, ...overrides };
}

export function tinyContext(overrides: Partial<RawInput> = {}): ProblemContext {
  return new ProblemContext(tinyInput(overrides));
}

/** An instance including a two-period lab, for the duration-handling tests. */
export function labContext(): ProblemContext {
  return new ProblemContext(
    tinyInput({
      courses: [
        { id: 'c1', code: 'C1', name: 'Course One', lecturesPerWeek: 1, labsPerWeek: 1, type: 'LAB' },
      ],
      rooms: [
        { id: 'r1', number: 'R1', capacity: 60, type: 'LECTURE_HALL' },
        { id: 'lab1', number: 'LAB1', capacity: 60, type: 'LAB' },
      ],
      batches: [{ id: 'b1', label: 'Batch One', studentCount: 30, courseIds: ['c1'] }],
    }),
  );
}

/**
 * An instance that admits a genuinely flawless timetable -- zero hard AND zero soft
 * penalty -- so the "fitness is exactly 1.0" claim of proposal Step 3 can be asserted
 * exactly rather than approximately.
 *
 * One batch, one course of six weekly lectures, one instructor, one room. Placing one
 * lecture on each of the six days at the same period leaves: no clash of any kind, no idle
 * gap (one session per day), a perfectly even daily spread, no repeated subject within a
 * day, and only one room so no utilisation imbalance.
 */
export function perfectContext(): ProblemContext {
  return new ProblemContext({
    courses: [{ id: 'c1', code: 'C1', name: 'Course One', lecturesPerWeek: 6, labsPerWeek: 0, type: 'LECTURE' }],
    instructors: [{ id: 'i1', name: 'Only Instructor', qualifiedCourseIds: ['c1'], availableSlotIds: ALL_SLOT_IDS }],
    rooms: [{ id: 'r1', number: 'R1', capacity: 60, type: 'LECTURE_HALL' }],
    batches: [{ id: 'b1', label: 'Batch One', studentCount: 30, courseIds: ['c1'] }],
    meetingTimes: buildMeetingTimes(),
  });
}
