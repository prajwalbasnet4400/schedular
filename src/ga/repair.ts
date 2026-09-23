/**
 * Targeted repair -- our addition to the proposal's Steps 1-7.
 *
 * On its own, the plain GA is slow to remove the last few clashes: once the population is
 * similar, crossover makes near-copies, and random mutation rarely hits the few genes
 * that are actually clashing. (On the sample data the plain GA needs 11-22 generations to
 * become clash-free and usually never reaches fitness 1.0; with repair it takes 2-3.)
 *
 * Repair fixes that. The fitness function already knows which genes clash, so for each of
 * them we try a few random new placements and keep the best one -- but only if it lowers
 * the penalty. It can never make a timetable worse.
 *
 * Returns the final evaluation so the caller does not have to score the child again.
 */
import { evaluate, type Evaluation } from './fitness';
import { SLOTS, type Chromosome, type Problem } from './problem';
import type { Rng } from './rng';

/** Random placements tried for each clashing gene. */
const TRIES_PER_GENE = 8;
/** At most this many clashing genes are repaired per child, to keep each generation fast. */
const MAX_GENES = 12;

export function repair(chromosome: Chromosome, problem: Problem, rng: Rng): Evaluation {
  // Score the child once; this also tells us which genes are in a clash.
  let current = evaluate(problem, chromosome);
  // Visit the clashing genes in random order, so no batch or teacher is always fixed first.
  const genes = shuffle(current.conflicted, rng).slice(0, MAX_GENES);

  for (const i of genes) {
    if (current.hardViolations === 0) break; // already clash-free, nothing left to fix
    const gene = chromosome[i];
    const session = problem.sessions[i];
    let best = { ...gene }; // remember the original placement

    for (let t = 0; t < TRIES_PER_GENE; t++) {
      // Try a completely new placement from the session's valid choices...
      gene.teacher = rng.pick(session.teachers);
      gene.room = rng.pick(session.rooms);
      gene.slot = rng.int(SLOTS);

      // ...and keep it only if the whole timetable's penalty goes down.
      const trial = evaluate(problem, chromosome);
      if (trial.penalty < current.penalty) {
        current = trial;
        best = { ...gene };
      }
    }

    // Put back the best placement found (the original one if nothing was better).
    Object.assign(gene, best);
  }

  return current;
}

/** Fisher-Yates shuffle: a random order of the items, using our seeded generator. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
