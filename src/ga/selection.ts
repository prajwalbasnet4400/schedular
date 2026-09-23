/**
 * Step 4 -- Tournament selection (k = 5).
 *
 * Pick k individuals at random; the fittest becomes a parent.
 */
import type { Chromosome } from './problem';
import type { Rng } from './rng';

export interface Individual {
  chromosome: Chromosome;
  fitness: number;
  hardViolations: number;
}

export function tournament(population: Individual[], k: number, rng: Rng): Individual {
  let best = rng.pick(population);
  for (let i = 1; i < k; i++) {
    const challenger = rng.pick(population);
    if (challenger.fitness > best.fitness) best = challenger;
  }
  return best;
}
