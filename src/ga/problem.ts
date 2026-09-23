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
 */
import { DAYS, PERIODS, type CollegeData } from '../data';

/** Time slots in a week. Slot s is day floor(s / 6), period s % 6. */
export const SLOTS = DAYS.length * PERIODS.length;

export interface Session {
  course: number;
  batch: number;
  /** Teachers qualified for this course. */
  teachers: number[];
  /** Rooms that can seat this batch. */
  rooms: number[];
}

export interface Gene {
  teacher: number;
  room: number;
  slot: number;
}

export type Chromosome = Gene[];

export interface Problem {
  data: CollegeData;
  sessions: Session[];
}

export function buildProblem(data: CollegeData): Problem {
  const sessions: Session[] = [];

  data.batches.forEach((batch, b) => {
    for (const code of batch.courses) {
      const c = data.courses.findIndex((course) => course.code === code);
      const teachers = indicesWhere(data.teachers, (t) => t.courses.includes(code));
      const rooms = indicesWhere(data.rooms, (r) => r.capacity >= batch.size);

      if (teachers.length === 0) throw new Error(`No teacher can teach ${code}.`);
      if (rooms.length === 0) throw new Error(`No room can seat ${batch.name}.`);

      for (let n = 0; n < data.courses[c].lecturesPerWeek; n++) {
        sessions.push({ course: c, batch: b, teachers, rooms });
      }
    }
  });

  return { data, sessions };
}

function indicesWhere<T>(items: T[], test: (item: T) => boolean): number[] {
  return items.flatMap((item, i) => (test(item) ? [i] : []));
}
