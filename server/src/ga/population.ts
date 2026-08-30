/**
 * Step 2 of proposal section 4.3.2 -- Population Initialization.
 *
 *   "The algorithm begins by generating an initial population of N randomly constructed
 *    chromosomes (the default population size is 100). Each chromosome is created by
 *    randomly assigning a valid teacher, a random room, and a random time slot to each
 *    required session. At this stage, conflicts are expected and accepted -- the fitness
 *    function will drive the population toward conflict-free solutions."
 *
 * "A valid teacher" is honoured strictly: only instructors qualified for the course are
 * ever drawn. Rooms are drawn from the pre-filtered eligible set, and start slots from the
 * set that leaves room for the session's duration. Conflicts between sessions are, exactly
 * as the proposal says, expected and left for evolution to remove.
 */
import type { ProblemContext } from './context';
import type { Chromosome } from './types';
import type { Rng } from './rng';

export function createRandomChromosome(ctx: ProblemContext, rng: Rng): Chromosome {
  const chromosome: Chromosome = new Array(ctx.requirements.length);

  for (let i = 0; i < ctx.requirements.length; i++) {
    const req = ctx.requirements[i];
    chromosome[i] = {
      instructorIndex: rng.pick(req.eligibleInstructors),
      roomIndex: rng.pick(req.eligibleRooms),
      startSlot: rng.pick(req.eligibleStartSlots),
    };
  }

  return chromosome;
}

export function createInitialPopulation(ctx: ProblemContext, rng: Rng, size: number): Chromosome[] {
  const population: Chromosome[] = new Array(size);
  for (let i = 0; i < size; i++) population[i] = createRandomChromosome(ctx, rng);
  return population;
}

export function cloneChromosome(chromosome: Chromosome): Chromosome {
  const copy: Chromosome = new Array(chromosome.length);
  for (let i = 0; i < chromosome.length; i++) {
    const g = chromosome[i];
    copy[i] = { instructorIndex: g.instructorIndex, roomIndex: g.roomIndex, startSlot: g.startSlot };
  }
  return copy;
}
