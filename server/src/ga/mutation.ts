/**
 * Step 6 of proposal section 4.3.2 -- Mutation.
 *
 *   "Each gene in the offspring has a small probability (default 0.05) of being mutated.
 *    Mutation randomly reassigns one attribute of the gene -- either the room, the time
 *    slot, or both -- to a different valid value. This operator introduces diversity and
 *    prevents premature convergence to local optima."
 *
 * The proposal lists room and time slot. Instructor reassignment is included as a fourth
 * case: several courses in the seed data have three qualified teachers, and without the
 * ability to move a session to a different one the algorithm can only resolve a teacher
 * clash by moving the session in time -- which is a much narrower escape route. Every
 * replacement is drawn from the requirement's pre-computed eligible set, so mutation can
 * never produce an unqualified teacher, an undersized room, or a lab in a lecture hall.
 */
import type { ProblemContext } from './context';
import type { Chromosome } from './types';
import type { Rng } from './rng';

export function mutate(chromosome: Chromosome, ctx: ProblemContext, rate: number, rng: Rng): void {
  for (let i = 0; i < chromosome.length; i++) {
    if (!rng.chance(rate)) continue;

    const gene = chromosome[i];
    const req = ctx.requirements[i];

    switch (rng.int(4)) {
      case 0:
        gene.roomIndex = rng.pick(req.eligibleRooms);
        break;
      case 1:
        gene.startSlot = rng.pick(req.eligibleStartSlots);
        break;
      case 2:
        // "or both"
        gene.roomIndex = rng.pick(req.eligibleRooms);
        gene.startSlot = rng.pick(req.eligibleStartSlots);
        break;
      default:
        gene.instructorIndex = rng.pick(req.eligibleInstructors);
        break;
    }
  }
}
