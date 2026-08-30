/**
 * Step 7 of proposal section 4.3.2 -- Termination, and the loop that drives Steps 3-6.
 *
 *   "The evolutionary loop repeats Steps 3 through 6 for a maximum of 1000 generations or
 *    until a chromosome achieves a fitness score of 1.0, whichever occurs first. The best
 *    chromosome from the final generation is decoded into the output timetable."
 *
 * One addition beyond the proposal, flagged for the report: an ADAPTIVE MUTATION KICK.
 * When the best fitness has not improved for `stagnationLimit` generations the mutation
 * rate is temporarily tripled, then restored the moment progress resumes. Plain GAs on
 * this problem reliably stall a handful of violations short of a perfect timetable -- the
 * population converges, crossover starts mixing near-identical parents, and only mutation
 * can supply new material. The kick is standard practice, is disabled by setting
 * stagnationLimit above maxGenerations, and its effect is quantified in the ablation
 * benchmark so the report can show it earning its place rather than merely assert it.
 */
import { DEFAULT_GA_CONFIG } from '@schedular/shared';
import type { FitnessBreakdown, GAConfig, GenerationProgress } from '@schedular/shared';
import { ProblemContext } from './context';
import { FitnessEvaluator } from './fitness';
import { Rng } from './rng';
import { cloneChromosome, createInitialPopulation } from './population';
import { tournamentSelect } from './selection';
import { singlePointCrossover } from './crossover';
import { mutate } from './mutation';
import { DEFAULT_REPAIR, repair } from './repair';
import { createRandomChromosome } from './population';
import type { Chromosome, Individual } from './types';

export type TerminationReason =
  | 'perfect-fitness'
  | 'soft-converged'
  | 'max-generations'
  | 'time-limit'
  | 'cancelled';

export interface GAResult {
  best: Chromosome;
  breakdown: FitnessBreakdown;
  generationsRun: number;
  durationMs: number;
  convergence: GenerationProgress[];
  /** True when a timetable with zero hard violations was found. */
  solved: boolean;
  /** True when the loop stopped because fitness reached exactly 1.0. */
  perfect: boolean;
  terminationReason: TerminationReason;
  /** Generation at which the first conflict-free timetable appeared, or -1. */
  solvedAtGeneration: number;
  /** Milliseconds to the first conflict-free timetable, or -1. This is the NFR1 metric. */
  solvedAtMs: number;
}

export interface EngineToggles {
  /**
   * Apply the targeted repair operator to offspring that still contain hard violations.
   * Off reproduces the pure algorithm of proposal Steps 1-7 exactly, which is what the
   * ablation benchmark compares against.
   */
  repairEnabled: boolean;
  /**
   * On stagnation, replace the weakest individuals with freshly randomised chromosomes.
   * A converged population has no diversity left for crossover to exploit; immigrants
   * reintroduce it without disturbing the elites.
   */
  immigrantsEnabled: boolean;
  /** Fraction of the population replaced by immigrants when stagnation triggers. */
  immigrantRate: number;
}

export const DEFAULT_TOGGLES: EngineToggles = {
  repairEnabled: true,
  immigrantsEnabled: true,
  immigrantRate: 0.15,
};

export interface RunOptions {
  /** Called once per generation, for the FR4 live progress stream. */
  onProgress?: (progress: GenerationProgress) => void;
  /** How often to emit progress. 1 = every generation. */
  progressInterval?: number;
  /** Cooperative cancellation, checked between generations. */
  shouldStop?: () => boolean;
  /** Wall-clock ceiling in milliseconds. Guards the NFR1 budget. */
  timeLimitMs?: number;
}

export class GeneticAlgorithm {
  private readonly ctx: ProblemContext;
  private readonly config: GAConfig;
  private readonly evaluator: FitnessEvaluator;
  private readonly rng: Rng;

  private readonly toggles: EngineToggles;

  constructor(ctx: ProblemContext, config: Partial<GAConfig> = {}, toggles: Partial<EngineToggles> = {}) {
    this.ctx = ctx;
    this.config = { ...DEFAULT_GA_CONFIG, ...config };
    this.toggles = { ...DEFAULT_TOGGLES, ...toggles };
    this.evaluator = new FitnessEvaluator(ctx);
    this.rng = new Rng(this.config.seed);
  }

  /**
   * Drives the search to completion synchronously. Used by the CLI, the benchmarks and the
   * test suite, where blocking is exactly what is wanted.
   */
  run(options: RunOptions = {}): GAResult {
    const iterator = this.steps(options);
    let step = iterator.next();
    while (!step.done) step = iterator.next();
    return step.value;
  }

  /**
   * Drives the same search while returning control to the Node event loop every
   * `yieldEvery` generations.
   *
   * This is what makes the FR4 live progress stream real rather than cosmetic. The
   * evolutionary loop is CPU-bound and synchronous; run straight through on a
   * single-threaded runtime it would occupy the process for the entire computation and
   * every queued progress event would arrive in one burst after the search had already
   * finished. Yielding lets Express actually flush each event to the browser while the
   * search is still going.
   */
  async runAsync(options: RunOptions = {}, yieldEvery = 5): Promise<GAResult> {
    const iterator = this.steps(options);
    let sinceYield = 0;

    for (;;) {
      const step = iterator.next();
      if (step.done) return step.value;
      if (++sinceYield >= yieldEvery) {
        sinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
  }

  /**
   * The evolutionary loop itself, expressed as a generator that yields once per
   * generation. Both `run` and `runAsync` drain it; there is exactly one implementation of
   * Steps 2-7, so the synchronous and streaming paths can never diverge.
   */
  private *steps(options: RunOptions = {}): Generator<void, GAResult, void> {
    const { populationSize, maxGenerations, crossoverRate, tournamentSize, elitismRate } = this.config;
    const progressInterval = options.progressInterval ?? 1;
    const startedAt = Date.now();

    // ---- Step 2: Population Initialization ----
    let population: Individual[] = createInitialPopulation(this.ctx, this.rng, populationSize).map((c) =>
      this.toIndividual(c),
    );

    const eliteCount = Math.max(1, Math.round(populationSize * elitismRate));
    const convergence: GenerationProgress[] = [];

    let best = this.bestOf(population);
    let bestBreakdown = this.evaluator.evaluate(best.chromosome);
    let generationsRun = 0;
    let stagnantFor = 0;
    let lastBestFitness = best.fitness;
    let terminationReason: TerminationReason = 'max-generations';
    let solvedAtGeneration = -1;
    let solvedAtMs = -1;

    for (let generation = 1; generation <= maxGenerations; generation++) {
      generationsRun = generation;

      // ---- Step 3: Fitness Evaluation (sort so elites and tournaments see current scores) ----
      population.sort((a, b) => b.fitness - a.fitness);

      const generationBest = population[0];
      if (generationBest.fitness > best.fitness) {
        best = { ...generationBest, chromosome: cloneChromosome(generationBest.chromosome) };
        bestBreakdown = this.evaluator.evaluate(best.chromosome);
      }

      if (generation % progressInterval === 0 || generation === 1) {
        const progress: GenerationProgress = {
          generation,
          bestFitness: best.fitness,
          averageFitness: population.reduce((s, i) => s + i.fitness, 0) / population.length,
          hardViolations: best.hardViolations,
          softViolations: best.softViolations,
          elapsedMs: Date.now() - startedAt,
        };
        convergence.push(progress);
        options.onProgress?.(progress);
      }

      // Record the first conflict-free timetable. This, not the generation the loop
      // happens to exit on, is the number NFR1 and Expected Outcome 2 are really about.
      if (solvedAtGeneration === -1 && best.hardViolations === 0) {
        solvedAtGeneration = generation;
        solvedAtMs = Date.now() - startedAt;
      }

      // ---- Step 7: Termination ----
      //
      // The proposal states the loop runs "until a chromosome achieves a fitness score of
      // 1.0". Taken literally that condition can never fire on a real dataset: fitness is
      // 1/(1+total_penalty), and total_penalty includes soft constraints, of which a
      // realistic timetable always carries a few -- a teacher with a single idle hour is
      // an ordinary timetable, not a defective one. Waiting for exactly 1.0 would mean
      // always running the full 1000 generations.
      //
      // The proposal's own Expected Outcome 2 resolves the ambiguity by equating the two:
      // "a fitness score of 1.0 (zero hard constraint violations)". Zero hard violations
      // is the intended goal, so the loop stops once that has been reached AND further
      // generations have stopped improving the soft score. The literal 1.0 test is kept
      // as well, for the degenerate case where a dataset admits a flawless timetable.
      if (best.fitness >= 1) {
        terminationReason = 'perfect-fitness';
        break;
      }
      if (best.hardViolations === 0 && stagnantFor >= this.config.stagnationLimit) {
        terminationReason = 'soft-converged';
        break;
      }
      if (options.shouldStop?.()) {
        terminationReason = 'cancelled';
        break;
      }
      if (options.timeLimitMs && Date.now() - startedAt > options.timeLimitMs) {
        terminationReason = 'time-limit';
        break;
      }

      // Adaptive mutation: escape a converged population that has stopped improving.
      if (best.fitness > lastBestFitness) {
        stagnantFor = 0;
        lastBestFitness = best.fitness;
      } else {
        stagnantFor++;
      }
      const mutationRate =
        stagnantFor >= this.config.stagnationLimit
          ? Math.min(0.5, this.config.mutationRate * 3)
          : this.config.mutationRate;

      // ---- Build the next generation ----
      const next: Individual[] = new Array(populationSize);

      // Elitism: the top 20% survive untouched, guaranteeing the best solution found so
      // far can never be lost to an unlucky crossover.
      for (let i = 0; i < eliteCount; i++) {
        next[i] = population[i];
      }

      // Random immigrants: when the search has stalled, refill the weakest slots with new
      // random chromosomes. Elites are never displaced, so the best-so-far is safe.
      let immigrantCount = 0;
      if (this.toggles.immigrantsEnabled && stagnantFor >= this.config.stagnationLimit) {
        immigrantCount = Math.min(
          populationSize - eliteCount,
          Math.round(populationSize * this.toggles.immigrantRate),
        );
        for (let i = 0; i < immigrantCount; i++) {
          next[populationSize - 1 - i] = this.toIndividual(createRandomChromosome(this.ctx, this.rng));
        }
      }

      for (let i = eliteCount; i < populationSize - immigrantCount; i++) {
        let child: Chromosome;

        // ---- Step 5: Crossover ----
        if (this.rng.chance(crossoverRate)) {
          const parentA = tournamentSelect(population, tournamentSize, this.rng);
          const parentB = tournamentSelect(population, tournamentSize, this.rng);
          child = singlePointCrossover(parentA.chromosome, parentB.chromosome, this.rng);
        } else {
          child = cloneChromosome(tournamentSelect(population, tournamentSize, this.rng).chromosome);
        }

        // ---- Step 6: Mutation ----
        mutate(child, this.ctx, mutationRate, this.rng);

        // ---- Targeted repair (documented refinement, see repair.ts) ----
        if (this.toggles.repairEnabled) {
          repair(child, this.ctx, this.evaluator, this.rng, DEFAULT_REPAIR);
        }

        next[i] = this.toIndividual(child);
      }

      population = next;

      // Hand control back to the caller. `run` resumes immediately; `runAsync` may first
      // let the event loop flush pending progress events to connected clients.
      yield;
    }

    const durationMs = Date.now() - startedAt;

    return {
      best: best.chromosome,
      breakdown: bestBreakdown,
      generationsRun,
      durationMs,
      convergence,
      solved: bestBreakdown.hardViolations === 0,
      perfect: bestBreakdown.fitness >= 1,
      terminationReason,
      solvedAtGeneration,
      solvedAtMs,
    };
  }

  private toIndividual(chromosome: Chromosome): Individual {
    const b = this.evaluator.evaluate(chromosome);
    return {
      chromosome,
      fitness: b.fitness,
      hardViolations: b.hardViolations,
      softViolations: b.softViolations,
    };
  }

  private bestOf(population: Individual[]): Individual {
    let best = population[0];
    for (const individual of population) if (individual.fitness > best.fitness) best = individual;
    return { ...best, chromosome: cloneChromosome(best.chromosome) };
  }
}
