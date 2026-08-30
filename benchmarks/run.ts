/**
 * Benchmark harness producing the figures for the Result Analysis chapter.
 *
 *   npx tsx benchmarks/run.ts [nfr1|sweep|scale|ablation|all]
 *
 * Every result is written to benchmarks/results/*.csv so the report's tables and graphs
 * are regenerated from data rather than transcribed by hand -- and so an examiner who asks
 * "can you reproduce that number?" can watch it happen.
 *
 * All runs are seeded. Where a benchmark reports an average it uses a fixed set of seeds,
 * so two executions on the same machine produce identical output.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_GA_CONFIG } from '@schedular/shared';
import { GeneticAlgorithm } from '../server/src/ga/engine';
import { buildInstance, INSTANCES } from './instances';
import type { InstanceSpec } from './instances';

const RESULTS = join(__dirname, 'results');
mkdirSync(RESULTS, { recursive: true });

const SEEDS = [11, 23, 37, 53, 71, 89, 101, 113, 131, 149];

interface RunRecord {
  [key: string]: string | number;
}

function writeCsv(filename: string, rows: RunRecord[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => String(row[h] ?? '')).join(',')),
  ];
  const path = join(RESULTS, filename);
  writeFileSync(path, lines.join('\n') + '\n');
  console.log(`  -> ${path}`);
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Benchmark 1 -- NFR1 compliance.
 *
 * "The system shall generate a conflict-free timetable for a typical college configuration
 *  (6 programs, 30 courses, 20 teachers, 15 rooms) within 120 seconds."
 *
 * The metric that matters is time to the FIRST conflict-free timetable, because that is
 * when the administrator has something usable. The run continues afterwards only to polish
 * soft preferences.
 */
function benchmarkNfr1(): void {
  console.log('\n=== Benchmark 1: NFR1 compliance (6 programs, 30 courses, 20 teachers, 15 rooms) ===');
  const spec = INSTANCES.find((i) => i.name.startsWith('medium'))!;
  const ctx = buildInstance(spec);

  console.log(`Sessions to place: ${ctx.requirements.length} (${ctx.totalPeriods} periods)`);
  const rows: RunRecord[] = [];

  for (const seed of SEEDS) {
    const result = new GeneticAlgorithm(ctx, { ...DEFAULT_GA_CONFIG, seed }).run();
    rows.push({
      seed,
      solved: result.solved ? 'yes' : 'no',
      solvedAtGeneration: result.solvedAtGeneration,
      solvedAtMs: result.solvedAtMs,
      totalGenerations: result.generationsRun,
      totalMs: result.durationMs,
      finalFitness: result.breakdown.fitness.toFixed(6),
      hardViolations: result.breakdown.hardViolations,
      softViolations: result.breakdown.softViolations,
      terminationReason: result.terminationReason,
    });
    console.log(
      `  seed ${String(seed).padStart(3)}: conflict-free at generation ${String(result.solvedAtGeneration).padStart(4)} ` +
        `in ${String(result.solvedAtMs).padStart(6)} ms  (total ${result.generationsRun} gens, ${result.durationMs} ms)`,
    );
  }

  const times = rows.map((r) => Number(r.solvedAtMs));
  const gens = rows.map((r) => Number(r.solvedAtGeneration));
  const allSolved = rows.every((r) => r.solved === 'yes');

  console.log('\n  --- Summary ---');
  console.log(`  Runs solved              : ${rows.filter((r) => r.solved === 'yes').length}/${rows.length}`);
  console.log(`  Time to conflict-free    : mean ${mean(times).toFixed(0)} ms, median ${median(times)} ms, worst ${Math.max(...times)} ms`);
  console.log(`  Generations to solve     : mean ${mean(gens).toFixed(1)}, median ${median(gens)}, worst ${Math.max(...gens)}`);
  console.log(`  NFR1 budget              : 120000 ms  -> ${Math.max(...times) < 120_000 && allSolved ? 'PASS' : 'FAIL'}`);
  console.log(`  Expected Outcome 2 budget: 500 generations -> ${Math.max(...gens) <= 500 && allSolved ? 'PASS' : 'FAIL'}`);

  writeCsv('nfr1-compliance.csv', rows);
  writeCsv('nfr1-summary.csv', [
    {
      metric: 'time-to-conflict-free-ms',
      mean: mean(times).toFixed(1),
      median: median(times),
      min: Math.min(...times),
      max: Math.max(...times),
      budget: 120000,
      verdict: Math.max(...times) < 120_000 && allSolved ? 'PASS' : 'FAIL',
    },
    {
      metric: 'generations-to-conflict-free',
      mean: mean(gens).toFixed(1),
      median: median(gens),
      min: Math.min(...gens),
      max: Math.max(...gens),
      budget: 500,
      verdict: Math.max(...gens) <= 500 && allSolved ? 'PASS' : 'FAIL',
    },
  ]);
}

/**
 * Benchmark 2 -- parameter sweep.
 * Expected Outcome 5: "comparative analysis of different parameter configurations
 * (population size, mutation rate, crossover rate)".
 */
function benchmarkSweep(): void {
  console.log('\n=== Benchmark 2: Parameter sweep ===');
  const spec = INSTANCES.find((i) => i.name.startsWith('medium'))!;
  const ctx = buildInstance(spec);

  const populations = [50, 100, 200];
  const mutations = [0.01, 0.05, 0.1];
  const crossovers = [0.6, 0.8, 0.95];
  const sweepSeeds = SEEDS.slice(0, 3);

  const rows: RunRecord[] = [];
  console.log('  pop  mut   cross | solved  gens(mean)  ms(mean)   fitness(mean)');

  for (const populationSize of populations) {
    for (const mutationRate of mutations) {
      for (const crossoverRate of crossovers) {
        const results = sweepSeeds.map((seed) =>
          new GeneticAlgorithm(ctx, {
            ...DEFAULT_GA_CONFIG,
            populationSize,
            mutationRate,
            crossoverRate,
            seed,
            // Cap generations so a poor configuration cannot dominate the sweep's runtime.
            maxGenerations: 400,
          }).run(),
        );

        const solved = results.filter((r) => r.solved).length;
        const solveGens = results.filter((r) => r.solved).map((r) => r.solvedAtGeneration);
        const solveMs = results.filter((r) => r.solved).map((r) => r.solvedAtMs);

        rows.push({
          populationSize,
          mutationRate,
          crossoverRate,
          runs: sweepSeeds.length,
          solved,
          meanGenerationsToSolve: solveGens.length ? mean(solveGens).toFixed(1) : 'n/a',
          meanMsToSolve: solveMs.length ? mean(solveMs).toFixed(0) : 'n/a',
          meanFinalFitness: mean(results.map((r) => r.breakdown.fitness)).toFixed(6),
          meanHardViolations: mean(results.map((r) => r.breakdown.hardViolations)).toFixed(2),
        });

        console.log(
          `  ${String(populationSize).padStart(3)}  ${String(mutationRate).padEnd(5)} ${String(crossoverRate).padEnd(5)} | ` +
            `${solved}/${sweepSeeds.length}     ${(solveGens.length ? mean(solveGens).toFixed(1) : 'n/a').padStart(8)}  ` +
            `${(solveMs.length ? mean(solveMs).toFixed(0) : 'n/a').padStart(8)}   ${mean(results.map((r) => r.breakdown.fitness)).toFixed(6)}`,
        );
      }
    }
  }

  writeCsv('parameter-sweep.csv', rows);
}

/** Benchmark 3 -- scalability: computation time against input size. */
function benchmarkScale(): void {
  console.log('\n=== Benchmark 3: Scalability ===');
  const rows: RunRecord[] = [];
  const scaleSeeds = SEEDS.slice(0, 3);

  console.log('  instance          sessions  periods  solved  gens(mean)  ms(mean)');
  for (const spec of INSTANCES) {
    const ctx = buildInstance(spec);
    const results = scaleSeeds.map((seed) =>
      new GeneticAlgorithm(ctx, { ...DEFAULT_GA_CONFIG, seed, maxGenerations: 600 }).run(),
    );

    const solved = results.filter((r) => r.solved);
    rows.push({
      instance: spec.name,
      programs: spec.programs,
      courses: spec.programs * spec.coursesPerProgram,
      batches: spec.programs * spec.sectionsPerProgram,
      instructors: spec.instructors,
      rooms: spec.lectureRooms + spec.labRooms,
      sessions: ctx.requirements.length,
      periods: ctx.totalPeriods,
      searchSpaceLog10: estimateSearchSpaceLog10(ctx).toFixed(1),
      runs: scaleSeeds.length,
      solved: solved.length,
      meanGenerationsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a',
      meanMsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a',
      meanTotalMs: mean(results.map((r) => r.durationMs)).toFixed(0),
      withinNfr1Budget: solved.length && Math.max(...solved.map((r) => r.solvedAtMs)) < 120_000 ? 'yes' : 'no',
    });

    console.log(
      `  ${spec.name.padEnd(16)}  ${String(ctx.requirements.length).padStart(8)}  ${String(ctx.totalPeriods).padStart(7)}  ` +
        `${solved.length}/${scaleSeeds.length}     ${(solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a').padStart(8)}  ` +
        `${(solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a').padStart(8)}`,
    );
  }

  writeCsv('scalability.csv', rows);
}

/**
 * Rough size of the search space, as log10(product of each gene's option count).
 * This is the number that makes the NP-hardness argument concrete during the defense:
 * exhaustive search is not merely slow, it is astronomically impossible.
 */
function estimateSearchSpaceLog10(ctx: ReturnType<typeof buildInstance>): number {
  let log = 0;
  for (const req of ctx.requirements) {
    const options = req.eligibleInstructors.length * req.eligibleRooms.length * req.eligibleStartSlots.length;
    if (options > 0) log += Math.log10(options);
  }
  return log;
}

/**
 * Benchmark 4 -- ablation.
 * Quantifies the two refinements added beyond the proposal's Steps 1-7, so the report can
 * show they earn their place rather than asserting it.
 */
function benchmarkAblation(): void {
  console.log('\n=== Benchmark 4: Ablation of the documented refinements ===');
  const spec = INSTANCES.find((i) => i.name.startsWith('medium'))!;
  const ctx = buildInstance(spec);
  const ablationSeeds = SEEDS.slice(0, 5);

  const variants: { name: string; toggles: { repairEnabled: boolean; immigrantsEnabled: boolean } }[] = [
    { name: 'proposal only (Steps 1-7)', toggles: { repairEnabled: false, immigrantsEnabled: false } },
    { name: 'plus random immigrants', toggles: { repairEnabled: false, immigrantsEnabled: true } },
    { name: 'plus targeted repair', toggles: { repairEnabled: true, immigrantsEnabled: false } },
    { name: 'both (shipped default)', toggles: { repairEnabled: true, immigrantsEnabled: true } },
  ];

  const rows: RunRecord[] = [];
  console.log('  variant                       solved  gens(mean)  ms(mean)  hard(mean)');

  for (const variant of variants) {
    const results = ablationSeeds.map((seed) =>
      new GeneticAlgorithm(ctx, { ...DEFAULT_GA_CONFIG, seed, maxGenerations: 500 }, variant.toggles).run(),
    );
    const solved = results.filter((r) => r.solved);

    rows.push({
      variant: variant.name,
      repair: variant.toggles.repairEnabled ? 'on' : 'off',
      immigrants: variant.toggles.immigrantsEnabled ? 'on' : 'off',
      runs: ablationSeeds.length,
      solved: solved.length,
      solveRate: `${((solved.length / ablationSeeds.length) * 100).toFixed(0)}%`,
      meanGenerationsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a',
      meanMsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a',
      meanFinalHardViolations: mean(results.map((r) => r.breakdown.hardViolations)).toFixed(2),
      meanFinalFitness: mean(results.map((r) => r.breakdown.fitness)).toFixed(6),
    });

    console.log(
      `  ${variant.name.padEnd(28)}  ${solved.length}/${ablationSeeds.length}     ` +
        `${(solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a').padStart(8)}  ` +
        `${(solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a').padStart(8)}  ` +
        `${mean(results.map((r) => r.breakdown.hardViolations)).toFixed(2).padStart(9)}`,
    );
  }

  // Tournament size is a proposal-specified parameter (k = 5); show it was chosen, not guessed.
  console.log('\n  --- Tournament size k ---');
  const kRows: RunRecord[] = [];
  console.log('  k    solved  gens(mean)  ms(mean)');
  for (const tournamentSize of [2, 3, 5, 10, 20]) {
    const results = ablationSeeds.map((seed) =>
      new GeneticAlgorithm(ctx, { ...DEFAULT_GA_CONFIG, seed, tournamentSize, maxGenerations: 500 }).run(),
    );
    const solved = results.filter((r) => r.solved);
    kRows.push({
      tournamentSize,
      runs: ablationSeeds.length,
      solved: solved.length,
      meanGenerationsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a',
      meanMsToSolve: solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a',
      meanFinalFitness: mean(results.map((r) => r.breakdown.fitness)).toFixed(6),
    });
    console.log(
      `  ${String(tournamentSize).padStart(2)}   ${solved.length}/${ablationSeeds.length}     ` +
        `${(solved.length ? mean(solved.map((r) => r.solvedAtGeneration)).toFixed(1) : 'n/a').padStart(8)}  ` +
        `${(solved.length ? mean(solved.map((r) => r.solvedAtMs)).toFixed(0) : 'n/a').padStart(8)}`,
    );
  }

  writeCsv('ablation.csv', rows);
  writeCsv('tournament-size.csv', kRows);
}

const which = process.argv[2] ?? 'all';
const startedAt = Date.now();

console.log('Automated College Timetable Generator -- benchmark suite');
console.log(`Node ${process.version} on ${process.platform} ${process.arch}`);
console.log(`Started ${new Date().toISOString()}`);

if (which === 'nfr1' || which === 'all') benchmarkNfr1();
if (which === 'sweep' || which === 'all') benchmarkSweep();
if (which === 'scale' || which === 'all') benchmarkScale();
if (which === 'ablation' || which === 'all') benchmarkAblation();

console.log(`\nCompleted in ${((Date.now() - startedAt) / 1000).toFixed(1)} s. CSVs in benchmarks/results/`);
