/**
 * Genetic Algorithm configuration and reporting contracts.
 *
 * Every default below is taken verbatim from the project proposal, section 4.3.2
 * ("Working Mechanism of the Genetic Algorithm"). They are reproduced here as a single
 * exported constant so that the running system and the written report can never drift
 * apart -- during the defense the panel can diff this file against the proposal directly.
 */

export interface GAConfig {
  /** Step 2: "the default population size is 100". */
  populationSize: number;
  /** Step 7: "a maximum of 1000 generations". */
  maxGenerations: number;
  /** Step 5: "The crossover rate is set to 0.8". */
  crossoverRate: number;
  /** Step 6: "Each gene in the offspring has a small probability (default 0.05)". */
  mutationRate: number;
  /** Step 4: "The tournament size k is set to 5 by default". */
  tournamentSize: number;
  /** Step 5: "20% consists of elite individuals carried forward unchanged". */
  elitismRate: number;
  /** Seed for the pseudo-random generator, making every run reproducible. */
  seed: number;
  /**
   * Generations without best-fitness improvement before the mutation rate is temporarily
   * raised to escape a local optimum. Not in the proposal; an implementation refinement
   * documented in the report.
   */
  stagnationLimit: number;
}

export const DEFAULT_GA_CONFIG: GAConfig = {
  populationSize: 100,
  maxGenerations: 1000,
  crossoverRate: 0.8,
  mutationRate: 0.05,
  tournamentSize: 5,
  elitismRate: 0.2,
  seed: 42,
  stagnationLimit: 50,
};

/**
 * Penalty weights. Proposal section 4.1.2 adopts Abramson's penalty-based fitness design:
 * "hard constraint violations receive severe penalties and soft constraint violations
 * receive lighter penalties."
 */
export const PENALTY_WEIGHTS = {
  /** --- Hard constraints. A timetable with any of these is unusable. --- */
  teacherConflict: 100,
  roomConflict: 100,
  batchConflict: 100,
  capacityViolation: 100,
  roomTypeMismatch: 100,
  instructorUnavailable: 100,
  instructorUnqualified: 100,
  /**
   * --- Soft constraints. Desirable, not mandatory. ---
   *
   * These weights are deliberately fractional, and the reason is worth stating because it
   * was discovered empirically rather than assumed. With weights of 3/2/2/1 the algorithm
   * stalled at six hard violations: a realistic timetable carries roughly 190 unavoidable
   * soft violations (a teacher with one idle hour is normal), so the soft term reached
   * ~40% of the total penalty and a move that removed a genuine clash could be rejected
   * because it added a few idle gaps. Scaling the soft weights down so their total stays
   * comfortably below the cost of a SINGLE hard violation (100) restores the intended
   * lexicographic behaviour: eliminate every conflict first, then polish. The stalled run
   * is reproducible with --soft-weights legacy and is reported in the ablation study.
   */
  instructorIdleGap: 0.3,
  unevenDistribution: 0.2,
  batchConsecutiveOverload: 0.2,
  roomUtilisationImbalance: 0.1,
} as const;

export type PenaltyKey = keyof typeof PENALTY_WEIGHTS;

export const HARD_CONSTRAINT_KEYS: readonly PenaltyKey[] = [
  'teacherConflict',
  'roomConflict',
  'batchConflict',
  'capacityViolation',
  'roomTypeMismatch',
  'instructorUnavailable',
  'instructorUnqualified',
];

export const SOFT_CONSTRAINT_KEYS: readonly PenaltyKey[] = [
  'instructorIdleGap',
  'unevenDistribution',
  'batchConsecutiveOverload',
  'roomUtilisationImbalance',
];

/** Raw violation counts, one entry per constraint category. */
export type ViolationCounts = Record<PenaltyKey, number>;

export interface FitnessBreakdown {
  /** Proposal Step 3: "Fitness = 1 / (1 + total_penalty)", in the range (0, 1]. */
  fitness: number;
  totalPenalty: number;
  hardPenalty: number;
  softPenalty: number;
  hardViolations: number;
  softViolations: number;
  counts: ViolationCounts;
}

/** One sample of the convergence curve, emitted once per generation. */
export interface GenerationProgress {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  hardViolations: number;
  softViolations: number;
  elapsedMs: number;
}
