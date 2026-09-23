/**
 * Step 6 -- Mutation (rate 0.05 per gene).
 *
 * A mutated gene gets a new room, a new slot, or both. New values come from the session's
 * own lists, so mutation never creates an unqualified teacher or a room that is too small.
 */
import { SLOTS, type Chromosome, type Problem } from './problem';
import type { Rng } from './rng';

export function mutate(chromosome: Chromosome, problem: Problem, rate: number, rng: Rng): void {
  chromosome.forEach((gene, i) => {
    if (!rng.chance(rate)) return;
    const session = problem.sessions[i];
    const choice = rng.int(3);
    if (choice !== 1) gene.room = rng.pick(session.rooms);
    if (choice !== 0) gene.slot = rng.int(SLOTS);
  });
}
