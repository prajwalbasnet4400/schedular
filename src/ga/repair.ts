/**
 * Targeted repair -- our addition to the proposal's Steps 1-7.
 *
 * On its own, the plain GA gets stuck a few clashes short of a valid timetable: once the
 * population is similar, crossover makes near-copies, and random mutation rarely hits the
 * few genes that are actually clashing.
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

const TRIES_PER_GENE = 8;
const MAX_GENES = 12;

export function repair(chromosome: Chromosome, problem: Problem, rng: Rng): Evaluation {
  let current = evaluate(problem, chromosome);
  const genes = shuffle(current.conflicted, rng).slice(0, MAX_GENES);

  for (const i of genes) {
    if (current.hardViolations === 0) break;
    const gene = chromosome[i];
    const session = problem.sessions[i];
    let best = { ...gene };

    for (let t = 0; t < TRIES_PER_GENE; t++) {
      gene.teacher = rng.pick(session.teachers);
      gene.room = rng.pick(session.rooms);
      gene.slot = rng.int(SLOTS);

      const trial = evaluate(problem, chromosome);
      if (trial.penalty < current.penalty) {
        current = trial;
        best = { ...gene };
      }
    }

    Object.assign(gene, best);
  }

  return current;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
