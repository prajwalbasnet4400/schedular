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
 */
import { DAYS, PERIODS } from '../data';
import { SLOTS, type Chromosome, type Problem } from './problem';

export const HARD_PENALTY = 100;
export const IDLE_GAP_PENALTY = 0.3;
export const UNEVEN_DAY_PENALTY = 0.2;

export interface Evaluation {
  fitness: number;
  penalty: number;
  hardViolations: number;
  softPenalty: number;
  /** Indices of genes involved in at least one clash. */
  conflicted: number[];
}

export function evaluate(problem: Problem, chromosome: Chromosome): Evaluation {
  const { teachers, rooms, batches } = problem.data;
  const teacherCell = new Int32Array(teachers.length * SLOTS).fill(-1);
  const roomCell = new Int32Array(rooms.length * SLOTS).fill(-1);
  const batchCell = new Int32Array(batches.length * SLOTS).fill(-1);
  const inClash = new Set<number>();
  let hardViolations = 0;

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

  chromosome.forEach((gene, i) => {
    const batch = problem.sessions[i].batch;
    claim(teacherCell, gene.teacher * SLOTS + gene.slot, i);
    claim(roomCell, gene.room * SLOTS + gene.slot, i);
    claim(batchCell, batch * SLOTS + gene.slot, i);
  });

  const softPenalty =
    IDLE_GAP_PENALTY * countIdleGaps(teacherCell, teachers.length) +
    UNEVEN_DAY_PENALTY * countUnevenDays(batchCell, batches.length);

  const penalty = HARD_PENALTY * hardViolations + softPenalty;

  return {
    fitness: 1 / (1 + penalty),
    penalty,
    hardViolations,
    softPenalty,
    conflicted: [...inClash],
  };
}

/** Free periods between a teacher's first and last class of the day. */
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
      if (first !== -1) gaps += last - first + 1 - taught;
    }
  }
  return gaps;
}

/** How far each batch's classes-per-day stray from an even spread. */
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
