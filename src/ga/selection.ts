/**
 * Step 4 -- Tournament selection (k = 5).
 *
 * Pick k individuals at random; the fittest becomes a parent.
 *
 * Why a tournament and not "roulette wheel" (chance proportional to fitness)? Fitness
 * values here are tiny and close together while clashes remain (e.g. 1/201 vs 1/301), so
 * proportional selection could barely tell them apart. A tournament only asks "which is
 * better?", so it keeps the pressure towards better timetables at every stage.
 */
import type { Chromosome } from './problem';
import type { Rng } from './rng';

/** A timetable together with its score, so we don't have to re-score it to compare. */
export interface Individual {
  chromosome: Chromosome;
  fitness: number;
  hardViolations: number;
}

export function tournament(population: Individual[], k: number, rng: Rng): Individual {
  let best = rng.pick(population); // first contestant
  for (let i = 1; i < k; i++) {
    const challenger = rng.pick(population); // k - 1 more, chosen at random
    if (challenger.fitness > best.fitness) best = challenger; // keep the fittest
  }
  return best;
}
