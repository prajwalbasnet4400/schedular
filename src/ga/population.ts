/**
 * Step 2 -- Population initialisation.
 *
 * Each gene gets a random qualified teacher, a random room that fits, and a random slot.
 * Clashes are expected at this stage; evolution removes them.
 */
import { SLOTS, type Chromosome, type Problem } from './problem';
import type { Rng } from './rng';

export function randomChromosome(problem: Problem, rng: Rng): Chromosome {
  return problem.sessions.map((s) => ({
    teacher: rng.pick(s.teachers),
    room: rng.pick(s.rooms),
    slot: rng.int(SLOTS),
  }));
}

export function clone(chromosome: Chromosome): Chromosome {
  return chromosome.map((g) => ({ ...g }));
}
