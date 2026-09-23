/**
 * Step 7 -- The evolutionary loop and termination.
 *
 * Each generation: keep the top 20% unchanged (elitism), then fill the rest with children
 * made by tournament selection, crossover, mutation and repair.
 *
 * The loop stops when fitness reaches 1.0, after 1000 generations, or once the timetable
 * is clash-free and the soft score has stopped improving for 20 generations. The sample
 * data reaches 1.0; the last rule is a fallback for bigger data, where a few soft penalties
 * (a teacher with one idle hour) can be unavoidable and 1.0 is out of reach.
 */
import { evaluate } from './fitness';
import { clone, randomChromosome } from './population';
import { type Chromosome, type Problem } from './problem';
import { repair } from './repair';
import { Rng } from './rng';
import { tournament, type Individual } from './selection';
import { crossover } from './crossover';
import { mutate } from './mutation';

/** The parameters from the proposal. The UI lets you edit a copy of these. */
export const CONFIG = {
  populationSize: 100, // Step 2: timetables per generation
  maxGenerations: 1000, // Step 7: hard upper limit
  crossoverRate: 0.8, // Step 5: share of children made by crossover
  mutationRate: 0.05, // Step 6: chance per gene
  tournamentSize: 5, // Step 4: k
  elitismRate: 0.2, // Step 5: top 20% kept unchanged
  /** Generations without improvement before stopping, once clash-free. */
  patience: 20,
  seed: 42,
};

export type Config = typeof CONFIG;

/** One point on the live chart, reported after every generation. */
export interface Progress {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  hardViolations: number;
  elapsedMs: number;
}

/** What the run produced. */
export interface Result {
  /** The best timetable found. */
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
  config: Config = CONFIG,
): Promise<Result> {
  const rng = new Rng(config.seed); // same seed -> same run, every time
  const started = performance.now();
  const eliteCount = Math.round(config.populationSize * config.elitismRate); // 20% of 100 = 20

  // Score a timetable and keep the score next to it.
  const toIndividual = (chromosome: Chromosome): Individual => {
    const e = evaluate(problem, chromosome);
    return { chromosome, fitness: e.fitness, hardViolations: e.hardViolations };
  };

  // Step 2: start with 100 random timetables.
  let population = Array.from({ length: config.populationSize }, () =>
    toIndividual(randomChromosome(problem, rng)),
  );

  let bestFitness = 0; // best fitness seen so far
  let sinceImproved = 0; // generations since bestFitness last went up
  let solvedAt = -1; // first generation with zero clashes
  let generation = 0;

  while (generation < config.maxGenerations) {
    generation++;

    // Step 3: every individual is already scored; sort best first.
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    if (best.fitness > bestFitness) {
      bestFitness = best.fitness;
      sinceImproved = 0;
    } else {
      sinceImproved++;
    }
    if (best.hardViolations === 0 && solvedAt === -1) solvedAt = generation;

    // Report this generation to the page, which adds a point to the chart.
    onProgress({
      generation,
      bestFitness: best.fitness,
      averageFitness: population.reduce((sum, i) => sum + i.fitness, 0) / population.length,
      hardViolations: best.hardViolations,
      elapsedMs: performance.now() - started,
    });

    // Step 7: termination.
    if (best.fitness === 1) break; // perfect: no clashes, no soft penalties
    if (best.hardViolations === 0 && sinceImproved >= config.patience) break; // good enough
    // (The while condition above stops the loop at maxGenerations.)

    // Build the next generation. Elitism: the top 20% go through unchanged, so the best
    // timetable found so far can never be lost.
    const next = population.slice(0, eliteCount);

    // Fill the other 80% with children.
    while (next.length < config.populationSize) {
      // Step 4 + 5: with probability 0.8, pick two parents by tournament and cross them;
      // otherwise copy one tournament winner.
      const child = rng.chance(config.crossoverRate)
        ? crossover(
            tournament(population, config.tournamentSize, rng).chromosome,
            tournament(population, config.tournamentSize, rng).chromosome,
            rng,
          )
        : clone(tournament(population, config.tournamentSize, rng).chromosome);

      mutate(child, problem, config.mutationRate, rng); // Step 6: small random changes
      const e = repair(child, problem, rng); // our addition: fix clashing genes if possible
      next.push({ chromosome: child, fitness: e.fitness, hardViolations: e.hardViolations });
    }
    population = next;

    // Pause for a moment so the browser can redraw the chart. Without this the page would
    // freeze until the whole run finished and the chart would appear all at once.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // The run is over: return the best timetable of the final generation.
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
