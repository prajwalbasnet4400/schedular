/**
 * Targeted repair -- a local-search operator applied to offspring that still contain hard
 * violations. This is an addition beyond the proposal's Steps 1-7 and is documented as
 * such; the hybrid it creates is known in the literature as a memetic algorithm.
 *
 * WHY IT IS HERE. The pure algorithm described in the proposal was implemented first and
 * behaves exactly as the textbooks predict: it removes violations quickly at the start,
 * then plateaus. On the seed dataset it reached six hard violations by generation 450 and
 * did not improve for the remaining 550 generations. The reason is structural rather than
 * a bug. Once the population has converged, crossover recombines near-identical parents
 * and produces near-identical children, so the only source of new material is mutation --
 * and mutation is blind. With ~200 genes and a 0.05 rate, roughly ten genes change per
 * child, chosen without regard to which genes are actually causing the six clashes. The
 * chance of landing on one of the handful of offending genes AND moving it somewhere free
 * is small, and any child that fails is discarded wholesale.
 *
 * The repair operator closes exactly that gap. The fitness evaluator already knows which
 * genes collided while it was counting violations, so this operator asks it, then tries a
 * bounded number of alternative placements for those specific genes and keeps a change
 * only if the total penalty falls. It is a strict improvement filter: it can never make a
 * chromosome worse, and it leaves conflict-free chromosomes untouched.
 *
 * The ablation benchmark reports the algorithm with and without it, so the report can show
 * the contribution as a measurement rather than a claim.
 */
import type { ProblemContext } from './context';
import type { FitnessEvaluator } from './fitness';
import type { Chromosome } from './types';
import type { Rng } from './rng';

export interface RepairOptions {
  /** Alternative placements tried per conflicted gene. */
  attemptsPerGene: number;
  /** Upper bound on conflicted genes visited in one call, to cap the cost per offspring. */
  maxGenes: number;
}

export const DEFAULT_REPAIR: RepairOptions = { attemptsPerGene: 8, maxGenes: 12 };

/**
 * Attempts to reduce the hard-violation count of `chromosome` in place.
 * Returns the resulting total penalty, so the caller can refresh its cached fitness.
 */
export function repair(
  chromosome: Chromosome,
  ctx: ProblemContext,
  evaluator: FitnessEvaluator,
  rng: Rng,
  options: RepairOptions = DEFAULT_REPAIR,
): number {
  let current = evaluator.evaluate(chromosome, true);
  if (current.hardViolations === 0) return current.totalPenalty;

  // Copy: the evaluator's buffer is overwritten by the trial evaluations below.
  const conflicted = [...evaluator.conflictedGenes];

  // Visit conflicted genes in random order. A fixed order would repeatedly favour the
  // low-numbered batches, which biases the search toward one corner of the timetable.
  for (let i = conflicted.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [conflicted[i], conflicted[j]] = [conflicted[j], conflicted[i]];
  }

  const budget = Math.min(conflicted.length, options.maxGenes);

  for (let n = 0; n < budget; n++) {
    const geneIndex = conflicted[n];
    const gene = chromosome[geneIndex];
    const req = ctx.requirements[geneIndex];

    const original = { ...gene };
    let bestPenalty = current.totalPenalty;
    let bestPlacement = original;

    for (let attempt = 0; attempt < options.attemptsPerGene; attempt++) {
      gene.instructorIndex = rng.pick(req.eligibleInstructors);
      gene.roomIndex = rng.pick(req.eligibleRooms);
      gene.startSlot = rng.pick(req.eligibleStartSlots);

      const trial = evaluator.evaluate(chromosome);
      if (trial.totalPenalty < bestPenalty) {
        bestPenalty = trial.totalPenalty;
        bestPlacement = { ...gene };
      }
    }

    // Strict improvement only: on no gain the gene is restored exactly as it was.
    gene.instructorIndex = bestPlacement.instructorIndex;
    gene.roomIndex = bestPlacement.roomIndex;
    gene.startSlot = bestPlacement.startSlot;

    if (bestPenalty < current.totalPenalty) {
      current = evaluator.evaluate(chromosome);
      if (current.hardViolations === 0) break;
    }
  }

  return current.totalPenalty;
}
