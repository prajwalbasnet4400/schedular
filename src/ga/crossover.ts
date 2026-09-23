/**
 * Step 5 -- Single-point crossover (rate 0.8).
 *
 * Genes before a random cut come from parent A, the rest from parent B. Gene i always
 * describes session i, so the child is always a complete, valid timetable: every session
 * is placed exactly once, and no repair is needed after crossover.
 *
 *   parent A:  A0 A1 A2 | A3 A4 A5
 *   parent B:  B0 B1 B2 | B3 B4 B5
 *   child:     A0 A1 A2   B3 B4 B5      (cut = 3)
 */
import type { Chromosome } from './problem';
import type { Rng } from './rng';

export function crossover(a: Chromosome, b: Chromosome, rng: Rng): Chromosome {
  // Cut somewhere from 1 to length-1, so the child always gets genes from both parents.
  const cut = 1 + rng.int(a.length - 1);
  // Copy each gene ({ ... }) so later mutation of the child can't change a parent.
  return a.map((gene, i) => ({ ...(i < cut ? gene : b[i]) }));
}
