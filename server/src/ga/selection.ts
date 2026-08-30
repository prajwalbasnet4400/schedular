/**
 * Step 4 of proposal section 4.3.2 -- Selection.
 *
 *   "Tournament selection is used to choose parent chromosomes for reproduction. In each
 *    tournament, k chromosomes are randomly selected from the population, and the one with
 *    the highest fitness is chosen as a parent. This method provides selection pressure
 *    toward better solutions while maintaining population diversity. The tournament size k
 *    is set to 5 by default."
 *
 * Note the deliberate absence of roulette-wheel selection. Because fitness is
 * 1 / (1 + penalty), scores cluster into a very narrow band once the population is even
 * moderately good -- a chromosome with 2 violations scores 0.00498 and one with 3 scores
 * 0.00332. Fitness-proportionate selection would be nearly blind at that resolution.
 * Tournament selection depends only on the ORDER of fitness values, never their spacing,
 * so it keeps full selection pressure however compressed the scores become. This is a
 * point worth making at the defense.
 */
import type { Individual } from './types';
import type { Rng } from './rng';

export function tournamentSelect(population: Individual[], k: number, rng: Rng): Individual {
  let best = population[rng.int(population.length)];
  for (let i = 1; i < k; i++) {
    const challenger = population[rng.int(population.length)];
    if (challenger.fitness > best.fitness) best = challenger;
  }
  return best;
}
