/**
 * Step 2 -- Population initialisation.
 *
 * Each gene gets a random qualified teacher, a random room that fits, and a random slot.
 * Clashes are expected at this stage (the sample data starts with about 10-14); evolution
 * removes them.
 */
import { SLOTS, type Chromosome, type Problem } from './problem';
import type { Rng } from './rng';

/** One random timetable: for every session, pick a teacher, a room and a slot at random. */
export function randomChromosome(problem: Problem, rng: Rng): Chromosome {
  return problem.sessions.map((s) => ({
    teacher: rng.pick(s.teachers), // only from the qualified teachers
    room: rng.pick(s.rooms), // only from rooms big enough for the batch
    slot: rng.int(SLOTS), // any of the 36 weekly slots
  }));
}

/** A deep copy, so changing the child never changes the parent it came from. */
export function clone(chromosome: Chromosome): Chromosome {
  return chromosome.map((g) => ({ ...g }));
}
