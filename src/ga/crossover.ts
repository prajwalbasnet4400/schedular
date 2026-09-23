/**
 * Step 5 -- Single-point crossover (rate 0.8).
 *
 * Genes before a random cut come from parent A, the rest from parent B. Gene i always
 * describes session i, so the child is always a complete, valid timetable.
 */
import type { Chromosome } from './problem';
import type { Rng } from './rng';

export function crossover(a: Chromosome, b: Chromosome, rng: Rng): Chromosome {
  const cut = 1 + rng.int(a.length - 1);
  return a.map((gene, i) => ({ ...(i < cut ? gene : b[i]) }));
}
