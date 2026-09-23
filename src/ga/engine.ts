/**
 * Step 7 -- The evolutionary loop and termination.
 *
 * Each generation: keep the top 20% unchanged (elitism), then fill the rest with children
 * made by tournament selection, crossover, mutation and repair.
 *
 * The loop stops when fitness reaches 1.0, after 1000 generations, or once the timetable
 * is clash-free and the soft score has stopped improving for 20 generations. The last rule
 * is needed because a real timetable always has a few soft penalties (a teacher with one
 * idle hour), so fitness almost never reaches exactly 1.0.
 */
import { evaluate } from './fitness';
import { clone, randomChromosome } from './population';
import { type Chromosome, type Problem } from './problem';
import { repair } from './repair';
import { Rng } from './rng';
import { tournament, type Individual } from './selection';
import { crossover } from './crossover';
import { mutate } from './mutation';

/** The parameters from the proposal. */
export const CONFIG = {
  populationSize: 100,
  maxGenerations: 1000,
  crossoverRate: 0.8,
  mutationRate: 0.05,
  tournamentSize: 5,
  elitismRate: 0.2,
  /** Generations without improvement before stopping, once clash-free. */
  patience: 20,
  seed: 42,
};

export interface Progress {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  hardViolations: number;
  elapsedMs: number;
}

export interface Result {
  best: Chromosome;
  fitness: number;
  hardViolations: number;
  softPenalty: number;
  generations: number;
  /** First generation with zero clashes, or -1 if none was found. */
  solvedAt: number;
  elapsedMs: number;
}

export async function runGA(
  problem: Problem,
  onProgress: (p: Progress) => void = () => {},
  seed = CONFIG.seed,
): Promise<Result> {
  const rng = new Rng(seed);
  const started = performance.now();
  const eliteCount = Math.round(CONFIG.populationSize * CONFIG.elitismRate);

  const toIndividual = (chromosome: Chromosome): Individual => {
    const e = evaluate(problem, chromosome);
    return { chromosome, fitness: e.fitness, hardViolations: e.hardViolations };
  };

  // Step 2
  let population = Array.from({ length: CONFIG.populationSize }, () =>
    toIndividual(randomChromosome(problem, rng)),
  );

  let bestFitness = 0;
  let sinceImproved = 0;
  let solvedAt = -1;
  let generation = 0;

  while (generation < CONFIG.maxGenerations) {
    generation++;

    // Step 3: rank by fitness
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    if (best.fitness > bestFitness) {
      bestFitness = best.fitness;
      sinceImproved = 0;
    } else {
      sinceImproved++;
    }
    if (best.hardViolations === 0 && solvedAt === -1) solvedAt = generation;

    onProgress({
      generation,
      bestFitness: best.fitness,
      averageFitness: population.reduce((sum, i) => sum + i.fitness, 0) / population.length,
      hardViolations: best.hardViolations,
      elapsedMs: performance.now() - started,
    });

    // Step 7: termination
    if (best.fitness === 1) break;
    if (best.hardViolations === 0 && sinceImproved >= CONFIG.patience) break;

    // Next generation: elites first, then children
    const next = population.slice(0, eliteCount);
    while (next.length < CONFIG.populationSize) {
      const child = rng.chance(CONFIG.crossoverRate)
        ? crossover(
            tournament(population, CONFIG.tournamentSize, rng).chromosome,
            tournament(population, CONFIG.tournamentSize, rng).chromosome,
            rng,
          ) // Step 5
        : clone(tournament(population, CONFIG.tournamentSize, rng).chromosome); // Step 4
      mutate(child, problem, CONFIG.mutationRate, rng); // Step 6
      const e = repair(child, problem, rng);
      next.push({ chromosome: child, fitness: e.fitness, hardViolations: e.hardViolations });
    }
    population = next;

    // Let the browser redraw the chart between generations.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  population.sort((a, b) => b.fitness - a.fitness);
  const final = evaluate(problem, population[0].chromosome);
  return {
    best: population[0].chromosome,
    fitness: final.fitness,
    hardViolations: final.hardViolations,
    softPenalty: final.softPenalty,
    generations: generation,
    solvedAt,
    elapsedMs: performance.now() - started,
  };
}
