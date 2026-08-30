/**
 * Orchestrates a timetable generation run.
 *
 * FR4: "The system shall provide real-time feedback during schedule generation, displaying
 * the current generation number and fitness score so that administrators can monitor the
 * optimization progress."
 *
 * The design problem here is that the GA is a tight synchronous loop and Node.js is
 * single-threaded: run it straight through and the event loop is blocked for the whole
 * computation, so the progress events it emits cannot actually be flushed to the browser
 * until it has already finished -- which would make the live chart a lie. The loop is
 * therefore driven in slices, yielding to the event loop between them via setImmediate, so
 * queued progress events are delivered while the search is still running.
 */
import type { GAConfig, GenerationEvent } from '@schedular/shared';
import { prisma } from '../lib/prisma';
import { loadProblemContext } from './problem-loader';
import { GeneticAlgorithm } from '../ga/engine';
import { decodeChromosome } from '../ga/decode';
import { analyseFeasibility } from '../ga/feasibility';
import type { ProblemContext } from '../ga/context';

type Listener = (event: GenerationEvent) => void;

interface ActiveRun {
  id: string;
  listeners: Set<Listener>;
  cancelled: boolean;
  /** Replayed to a client that connects after generation has already begun. */
  history: GenerationEvent[];
}

const activeRuns = new Map<string, ActiveRun>();

export function subscribe(runId: string, listener: Listener): () => void {
  const run = activeRuns.get(runId);
  if (!run) return () => undefined;

  // Replay what has already happened, so a late subscriber still draws the full curve.
  for (const event of run.history) listener(event);
  run.listeners.add(listener);
  return () => run.listeners.delete(listener);
}

export function cancelRun(runId: string): boolean {
  const run = activeRuns.get(runId);
  if (!run) return false;
  run.cancelled = true;
  return true;
}

function emit(run: ActiveRun, event: GenerationEvent): void {
  run.history.push(event);
  for (const listener of run.listeners) listener(event);
}

export interface StartRunResult {
  runId: string;
  totalSessions: number;
}

/**
 * Validates the input, creates the run record, and starts the search in the background.
 * Returns as soon as the run has an id, so the client can open its progress stream.
 */
export async function startRun(userId: string, config: GAConfig): Promise<StartRunResult> {
  const ctx = await loadProblemContext();

  // NFR4: refuse impossible input up front, with a specific reason.
  const feasibility = analyseFeasibility(ctx);
  if (!feasibility.feasible) {
    const record = await prisma.scheduleRun.create({
      data: {
        status: 'INFEASIBLE',
        config: config as unknown as object,
        createdById: userId,
        message: feasibility.errors.map((e) => e.message).join(' '),
        completedAt: new Date(),
      },
    });
    const error = new Error(feasibility.errors.map((e) => e.message).join(' ')) as Error & {
      status?: number;
      runId?: string;
      feasibility?: unknown;
    };
    error.status = 422;
    error.runId = record.id;
    error.feasibility = feasibility;
    throw error;
  }

  const record = await prisma.scheduleRun.create({
    data: { status: 'RUNNING', config: config as unknown as object, createdById: userId },
  });

  const run: ActiveRun = { id: record.id, listeners: new Set(), cancelled: false, history: [] };
  activeRuns.set(record.id, run);

  emit(run, { type: 'started', runId: record.id, totalSessions: ctx.requirements.length });

  // Deliberately not awaited: the HTTP response must return now so the browser can open
  // the event stream and watch the run it just started.
  void execute(run, ctx, config).catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Generation failed.';
    emit(run, { type: 'failed', runId: run.id, message });
    await prisma.scheduleRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', message, completedAt: new Date() },
    });
    scheduleCleanup(run.id);
  });

  return { runId: record.id, totalSessions: ctx.requirements.length };
}

async function execute(run: ActiveRun, ctx: ProblemContext, config: GAConfig): Promise<void> {
  const ga = new GeneticAlgorithm(ctx, config);

  // Slicing: the generation loop is long-running and synchronous, so it is broken into
  // chunks with a yield between them. `runSliced` below performs the same computation as
  // ga.run(), just cooperatively.
  const result = await runSliced(ga, run);

  const assignments = decodeChromosome(ctx, result.best);

  await prisma.$transaction([
    prisma.scheduleAssignment.deleteMany({ where: { runId: run.id } }),
    prisma.scheduleAssignment.createMany({
      data: assignments.map((a) => ({
        runId: run.id,
        courseId: a.courseId,
        instructorId: a.instructorId,
        roomId: a.roomId,
        meetingTimeId: a.meetingTimeId,
        batchId: a.batchId,
        sessionType: a.sessionType,
        sessionGroupId: a.sessionGroupId,
      })),
    }),
    prisma.scheduleRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        bestFitness: result.breakdown.fitness,
        generationsRun: result.generationsRun,
        durationMs: result.durationMs,
        hardViolations: result.breakdown.hardViolations,
        softViolations: result.breakdown.softViolations,
        breakdown: result.breakdown as unknown as object,
        convergence: result.convergence as unknown as object,
        message: describeOutcome(result),
        completedAt: new Date(),
      },
    }),
  ]);

  emit(run, {
    type: 'completed',
    runId: run.id,
    bestFitness: result.breakdown.fitness,
    generationsRun: result.generationsRun,
    durationMs: result.durationMs,
  });

  scheduleCleanup(run.id);
}

function describeOutcome(result: { solved: boolean; solvedAtGeneration: number; solvedAtMs: number; breakdown: { hardViolations: number } }): string {
  if (result.solved) {
    return `Conflict-free timetable found at generation ${result.solvedAtGeneration} (${result.solvedAtMs} ms), then refined for soft preferences.`;
  }
  return `Search ended with ${result.breakdown.hardViolations} unresolved hard-constraint violation(s). Try increasing the population size or the generation limit, or relax the input constraints.`;
}

/**
 * Runs the GA, forwarding each progress sample to every connected client as it happens.
 *
 * `runAsync` yields to the event loop every few generations (see engine.ts), which is what
 * allows Express to actually write these events onto the open SSE connections while the
 * search is still running rather than dumping them all at the end.
 */
async function runSliced(ga: GeneticAlgorithm, run: ActiveRun) {
  return ga.runAsync({
    // One sample per generation would push thousands of events on a long run; every fifth
    // keeps the convergence curve smooth without flooding the stream.
    progressInterval: 5,
    onProgress: (progress) => emit(run, { type: 'progress', runId: run.id, progress }),
    shouldStop: () => run.cancelled,
    // Hard ceiling matching the NFR1 budget, so pathological input cannot pin the server.
    timeLimitMs: 120_000,
  });
}

/** Keeps a finished run subscribable briefly, so a slow client still sees the final event. */
function scheduleCleanup(runId: string): void {
  setTimeout(() => activeRuns.delete(runId), 60_000).unref();
}

export function isRunActive(runId: string): boolean {
  return activeRuns.has(runId);
}
