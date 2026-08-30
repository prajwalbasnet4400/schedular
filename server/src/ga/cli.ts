/**
 * Command-line harness for the GA engine.
 *
 *   npm run -w server ga:cli -- --population 100 --generations 1000 --seed 42
 *
 * Used during development and to produce the figures in the Result Analysis chapter,
 * without needing the HTTP layer or the browser in the loop.
 */
import 'dotenv/config';
import { DEFAULT_GA_CONFIG } from '@schedular/shared';
import { loadProblemContext } from '../services/problem-loader';
import { GeneticAlgorithm } from './engine';
import { analyseFeasibility } from './feasibility';
import { prisma } from '../lib/prisma';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
}

async function main() {
  const ctx = await loadProblemContext();

  const feasibility = analyseFeasibility(ctx);
  console.log('\n--- Feasibility ---');
  console.log(`sessions=${feasibility.stats.requiredSessions}  periods=${ctx.totalPeriods}  ` +
    `roomSlots=${feasibility.stats.availableRoomSlots}  utilisation=${(feasibility.stats.utilisationRatio * 100).toFixed(1)}%`);
  for (const e of feasibility.errors) console.log(`  ERROR   ${e.code}: ${e.message}`);
  for (const w of feasibility.warnings) console.log(`  WARNING ${w.code}: ${w.message}`);
  if (!feasibility.feasible) {
    console.log('\nInput is infeasible; not running the algorithm.');
    return;
  }

  const config = {
    populationSize: arg('population', DEFAULT_GA_CONFIG.populationSize),
    maxGenerations: arg('generations', DEFAULT_GA_CONFIG.maxGenerations),
    mutationRate: arg('mutation', DEFAULT_GA_CONFIG.mutationRate),
    crossoverRate: arg('crossover', DEFAULT_GA_CONFIG.crossoverRate),
    tournamentSize: arg('tournament', DEFAULT_GA_CONFIG.tournamentSize),
    elitismRate: arg('elitism', DEFAULT_GA_CONFIG.elitismRate),
    seed: arg('seed', DEFAULT_GA_CONFIG.seed),
    stagnationLimit: arg('stagnation', DEFAULT_GA_CONFIG.stagnationLimit),
  };

  console.log('\n--- Configuration ---');
  console.table(config);

  const ga = new GeneticAlgorithm(ctx, config);
  console.log('\n--- Evolution ---');

  const result = ga.run({
    progressInterval: 25,
    onProgress: (p) =>
      console.log(
        `gen ${String(p.generation).padStart(4)}  best=${p.bestFitness.toFixed(6)}  ` +
          `avg=${p.averageFitness.toFixed(6)}  hard=${String(p.hardViolations).padStart(4)}  ` +
          `soft=${String(p.softViolations).padStart(4)}  ${p.elapsedMs}ms`,
      ),
  });

  console.log('\n--- Result ---');
  console.log(`generations : ${result.generationsRun}  (stopped: ${result.terminationReason})`);
  console.log(`duration    : ${result.durationMs} ms`);
  console.log(`solved at   : generation ${result.solvedAtGeneration}, ${result.solvedAtMs} ms   <-- NFR1 metric`);
  console.log(`fitness     : ${result.breakdown.fitness.toFixed(6)}`);
  console.log(`hard        : ${result.breakdown.hardViolations}`);
  console.log(`soft        : ${result.breakdown.softViolations}`);
  console.log(`solved      : ${result.solved}  (zero hard-constraint violations)`);
  console.table(result.breakdown.counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
