/**
 * Step 3 -- Fitness evaluation.
 *
 *   Fitness = 1 / (1 + total_penalty)
 *
 * Hard constraints (penalty 100 each) -- a timetable breaking any of these is unusable:
 *   - a teacher in two places at once
 *   - a room booked twice
 *   - a batch in two classes at once
 *
 * Soft constraints (small penalties) -- nice to have:
 *   - idle gaps in a teacher's day
 *   - a batch's classes spread unevenly across the week
 *
 * The soft weights are small on purpose: all soft penalties together stay below the cost
 * of one hard violation, so the algorithm always fixes clashes first.
 *
 * Clashes are found in one pass: each (teacher, slot), (room, slot) and (batch, slot) cell
 * remembers which gene took it first. A gene landing on a taken cell is a clash, and both
 * genes are recorded so the repair step knows exactly which genes to move.
 *
 * Worked example: 1 clash and 2 idle gaps -> penalty = 100 + 0.6 = 100.6,
 * fitness = 1 / 101.6 = 0.0098. No clashes and no soft penalties -> fitness = 1 / 1 = 1.0.
 */
import { DAYS, PERIODS } from '../data';
import { SLOTS, type Chromosome, type Problem } from './problem';

/** Penalty for each clash. */
export const HARD_PENALTY = 100;
/** Penalty for each free period between a teacher's first and last class of a day. */
export const IDLE_GAP_PENALTY = 0.3;
/** Penalty per class of difference from an even spread of a batch's classes over the week. */
export const UNEVEN_DAY_PENALTY = 0.2;

/** Everything we learn from scoring one timetable. */

export interface Evaluation {
  /** 1 / (1 + penalty): between 0 and 1, higher is better, 1.0 is perfect. */
  fitness: number;
  /** Total penalty: 100 per clash plus the soft penalties. */
  penalty: number;
  /** Number of clashes. 0 means the timetable is usable. */
  hardViolations: number;
  softPenalty: number;
  /** Indices of genes involved in at least one clash. */
  conflicted: number[];
}

export function evaluate(problem: Problem, chromosome: Chromosome): Evaluation {
  const { teachers, rooms, batches } = problem.data;

  // Three occupancy grids. teacherCell[t * 36 + slot] holds the index of the gene that has
  // teacher t busy in that slot, or -1 if free. Same idea for rooms and batches.
  const teacherCell = new Int32Array(teachers.length * SLOTS).fill(-1);
  const roomCell = new Int32Array(rooms.length * SLOTS).fill(-1);
  const batchCell = new Int32Array(batches.length * SLOTS).fill(-1);
  const inClash = new Set<number>(); // genes involved in any clash (for repair.ts)
  let hardViolations = 0;

  // Try to book a cell for a gene. If someone already has it, that's a clash.
  const claim = (cells: Int32Array, cell: number, gene: number) => {
    const owner = cells[cell];
    if (owner === -1) {
      cells[cell] = gene;
    } else {
      hardViolations++;
      inClash.add(gene);
      inClash.add(owner);
    }
  };

  // Book every gene's teacher, room and batch for its slot. Each gene is looked at once,
  // so this is fast even for big timetables (no comparing every pair of genes).
  chromosome.forEach((gene, i) => {
    const batch = problem.sessions[i].batch;
    claim(teacherCell, gene.teacher * SLOTS + gene.slot, i);
    claim(roomCell, gene.room * SLOTS + gene.slot, i);
    claim(batchCell, batch * SLOTS + gene.slot, i);
  });

  // Soft constraints are read off the same grids after booking.
  const softPenalty =
    IDLE_GAP_PENALTY * countIdleGaps(teacherCell, teachers.length) +
    UNEVEN_DAY_PENALTY * countUnevenDays(batchCell, batches.length);

  const penalty = HARD_PENALTY * hardViolations + softPenalty;

  return {
    fitness: 1 / (1 + penalty), // the proposal's formula
    penalty,
    hardViolations,
    softPenalty,
    conflicted: [...inClash],
  };
}

/**
 * Free periods between a teacher's first and last class of the day.
 * Classes in periods 1 and 4 -> periods 2 and 3 are idle -> 2 gaps. Classes in 1 and 2 -> 0.
 */
function countIdleGaps(teacherCell: Int32Array, teacherCount: number): number {
  let gaps = 0;
  for (let t = 0; t < teacherCount; t++) {
    for (let day = 0; day < DAYS.length; day++) {
      const start = t * SLOTS + day * PERIODS.length;
      let first = -1;
      let last = -1;
      let taught = 0;
      for (let p = 0; p < PERIODS.length; p++) {
        if (teacherCell[start + p] === -1) continue;
        if (first === -1) first = p;
        last = p;
        taught++;
      }
      // (span from first to last class) minus (classes taught) = idle periods in between
      if (first !== -1) gaps += last - first + 1 - taught;
    }
  }
  return gaps;
}

/**
 * How far each batch's classes-per-day stray from an even spread.
 * 12 classes over 6 days should be 2 a day; a day with 4 adds 2, a day with 0 adds 2.
 */
function countUnevenDays(batchCell: Int32Array, batchCount: number): number {
  let total = 0;
  for (let b = 0; b < batchCount; b++) {
    const perDay = DAYS.map((_, day) => {
      let n = 0;
      for (let p = 0; p < PERIODS.length; p++) {
        if (batchCell[b * SLOTS + day * PERIODS.length + p] !== -1) n++;
      }
      return n;
    });
    const mean = perDay.reduce((a, n) => a + n, 0) / DAYS.length;
    total += perDay.reduce((a, n) => a + Math.abs(n - mean), 0);
  }
  return total;
}
