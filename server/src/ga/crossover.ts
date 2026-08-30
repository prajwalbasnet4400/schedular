/**
 * Step 5 of proposal section 4.3.2 -- Crossover.
 *
 *   "Two parent chromosomes are combined using single-point crossover. A random crossover
 *    point is chosen, and the genes before that point are taken from the first parent while
 *    the genes after are taken from the second parent, producing an offspring chromosome.
 *    The crossover rate is set to 0.8, meaning 80% of the new population is generated
 *    through crossover while 20% consists of elite individuals carried forward unchanged."
 *
 * The offspring is always well-formed and needs no repair. That is a direct consequence of
 * the encoding: gene i of every chromosome answers the same question ("where does
 * requirement i go?"), so splicing two parents at any point still yields exactly one
 * placement per requirement. Encodings that store a permutation or a variable-length gene
 * list require a repair operator here; this one does not, which is worth stating plainly
 * when the panel asks why the offspring is guaranteed valid.
 */
import type { Chromosome } from './types';
import type { Rng } from './rng';

export function singlePointCrossover(parentA: Chromosome, parentB: Chromosome, rng: Rng): Chromosome {
  const length = parentA.length;
  const offspring: Chromosome = new Array(length);

  // A cut at 0 or at `length` would copy one parent wholesale and do no mixing at all,
  // so the point is drawn from the interior positions only.
  const point = length > 1 ? 1 + rng.int(length - 1) : 0;

  for (let i = 0; i < length; i++) {
    const source = i < point ? parentA[i] : parentB[i];
    offspring[i] = {
      instructorIndex: source.instructorIndex,
      roomIndex: source.roomIndex,
      startSlot: source.startSlot,
    };
  }

  return offspring;
}
