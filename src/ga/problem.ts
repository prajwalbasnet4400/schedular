/**
 * Step 1 -- Encoding.
 *
 * A course with 3 lectures a week becomes 3 sessions. The list of sessions is fixed, so a
 * chromosome is simply an array whose i-th gene says where session i goes: which teacher,
 * which room, which time slot. Course and batch never change, so the gene does not store
 * them.
 *
 * Qualification and room capacity are enforced here, by construction: each session keeps
 * a list of the teachers qualified for it and the rooms big enough for its batch, and genes
 * are only ever drawn from those lists. The GA therefore only has to solve the clashes.
 *
 * Example with the sample data: BCA 5A takes CACS301 (3 lectures/week), so sessions 0, 1
 * and 2 are "CACS301 for BCA 5A". Their teacher list is [Ram, Anita] (the two qualified
 * teachers) and their room list is [A-101] (the only room that seats 48).
 */
import { DAYS, PERIODS, type CollegeData } from '../data';

/**
 * Time slots in a week: 6 days x 6 periods = 36, numbered 0..35.
 * Slot s is day floor(s / 6), period s % 6 -- e.g. slot 7 is Monday, 2nd period (07:30).
 */
export const SLOTS = DAYS.length * PERIODS.length;

/** One class that must be placed somewhere in the week. Built once, never changes. */
export interface Session {
  /** Index into data.courses. */
  course: number;
  /** Index into data.batches. */
  batch: number;
  /** Teachers qualified for this course (indices into data.teachers). */
  teachers: number[];
  /** Rooms that can seat this batch (indices into data.rooms). */
  rooms: number[];
}

/**
 * A gene: where session i goes. These three numbers are the only things the GA changes.
 * Together with the session's course and batch, this is the proposal's
 * (Course, Teacher, Room, Time Slot, Batch) tuple.
 */
export interface Gene {
  teacher: number;
  room: number;
  slot: number;
}

/** A chromosome is one complete timetable: gene i places session i. */
export type Chromosome = Gene[];

/** Everything the GA needs: the original data plus the list of sessions to place. */
export interface Problem {
  data: CollegeData;
  sessions: Session[];
}

export function buildProblem(data: CollegeData): Problem {
  const sessions: Session[] = [];
  const codes = data.courses.map((course) => course.code);

  // --- Check the data first, so a mistake gives a clear message instead of a crash. ---

  // Each course code must be unique, because teachers and batches refer to courses by code.
  codes.forEach((code, i) => {
    if (codes.indexOf(code) !== i) throw new Error(`Course code ${code} is used twice.`);
  });
  // Every course a teacher or batch mentions must exist.
  for (const person of [...data.teachers, ...data.batches]) {
    const unknown = person.courses.find((code) => !codes.includes(code));
    if (unknown) throw new Error(`${person.name} lists unknown course ${unknown}.`);
  }

  // --- Expand every (batch, course) pair into one session per weekly lecture. ---
  data.batches.forEach((batch, b) => {
    for (const code of batch.courses) {
      const c = codes.indexOf(code);

      // The valid choices for this session. The GA only ever picks from these lists,
      // which is why an unqualified teacher or a too-small room can never appear.
      const teachers = indicesWhere(data.teachers, (t) => t.courses.includes(code));
      const rooms = indicesWhere(data.rooms, (r) => r.capacity >= batch.size);

      // An empty list means the problem is impossible -- say so now, before running the GA.
      if (teachers.length === 0) throw new Error(`No teacher can teach ${code}.`);
      if (rooms.length === 0) throw new Error(`No room can seat ${batch.name}.`);

      for (let n = 0; n < data.courses[c].lecturesPerWeek; n++) {
        sessions.push({ course: c, batch: b, teachers, rooms });
      }
    }
  });

  return { data, sessions };
}

/** The indices of the items that pass `test`, e.g. which teachers can teach a course. */
function indicesWhere<T>(items: T[], test: (item: T) => boolean): number[] {
  return items.flatMap((item, i) => (test(item) ? [i] : []));
}
