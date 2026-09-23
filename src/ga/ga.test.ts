import { describe, expect, it } from 'vitest';
import { COLLEGE } from '../data';
import { crossover } from './crossover';
import { runGA } from './engine';
import { evaluate, HARD_PENALTY } from './fitness';
import { mutate } from './mutation';
import { randomChromosome } from './population';
import { buildProblem, SLOTS, type Chromosome, type Problem } from './problem';
import { Rng } from './rng';

const problem = buildProblem(COLLEGE);

/** Two sessions of different batches, teachers and rooms. */
const tiny: Problem = buildProblem({
  courses: [
    { code: 'A', name: 'A', lecturesPerWeek: 1 },
    { code: 'B', name: 'B', lecturesPerWeek: 1 },
  ],
  teachers: [{ name: 'T0', courses: ['A', 'B'] }, { name: 'T1', courses: ['A', 'B'] }],
  rooms: [{ name: 'R0', capacity: 50 }, { name: 'R1', capacity: 50 }],
  batches: [{ name: 'B0', size: 30, courses: ['A'] }, { name: 'B1', size: 30, courses: ['B'] }],
});

describe('encoding', () => {
  it('makes one session per weekly lecture', () => {
    expect(problem.sessions).toHaveLength(12 * 5 * 3);
  });

  it('only offers qualified teachers and rooms that fit', () => {
    for (const s of problem.sessions) {
      const code = COLLEGE.courses[s.course].code;
      for (const t of s.teachers) expect(COLLEGE.teachers[t].courses).toContain(code);
      for (const r of s.rooms) expect(COLLEGE.rooms[r].capacity).toBeGreaterThanOrEqual(COLLEGE.batches[s.batch].size);
    }
  });
});

describe('fitness', () => {
  it('scores a clash-free timetable with no hard violations', () => {
    const c: Chromosome = [{ teacher: 0, room: 0, slot: 0 }, { teacher: 1, room: 1, slot: 0 }];
    const e = evaluate(tiny, c);
    expect(e.hardViolations).toBe(0);
    expect(e.fitness).toBe(1 / (1 + e.penalty));
  });

  it('detects a teacher clash and flags both genes', () => {
    const c: Chromosome = [{ teacher: 0, room: 0, slot: 0 }, { teacher: 0, room: 1, slot: 0 }];
    const e = evaluate(tiny, c);
    expect(e.hardViolations).toBe(1);
    expect(e.penalty).toBeGreaterThanOrEqual(HARD_PENALTY);
    expect(e.conflicted.sort()).toEqual([0, 1]);
  });

  it('detects a room clash', () => {
    const c: Chromosome = [{ teacher: 0, room: 0, slot: 5 }, { teacher: 1, room: 0, slot: 5 }];
    expect(evaluate(tiny, c).hardViolations).toBe(1);
  });
});

describe('operators', () => {
  it('crossover keeps one gene per session, each from a parent', () => {
    const rng = new Rng(1);
    const a = randomChromosome(problem, rng);
    const b = randomChromosome(problem, rng);
    const child = crossover(a, b, rng);
    expect(child).toHaveLength(a.length);
    child.forEach((g, i) => expect([a[i], b[i]]).toContainEqual(g));
  });

  it('mutation only uses valid values', () => {
    const rng = new Rng(2);
    const c = randomChromosome(problem, rng);
    mutate(c, problem, 1, rng);
    c.forEach((g, i) => {
      expect(problem.sessions[i].rooms).toContain(g.room);
      expect(g.slot).toBeGreaterThanOrEqual(0);
      expect(g.slot).toBeLessThan(SLOTS);
    });
  });
});

describe('genetic algorithm', () => {
  it('finds a clash-free timetable within 500 generations and 120 seconds', async () => {
    const r = await runGA(problem);
    expect(r.hardViolations).toBe(0);
    expect(r.solvedAt).toBeGreaterThan(0);
    expect(r.solvedAt).toBeLessThanOrEqual(500);
    expect(r.elapsedMs).toBeLessThan(120_000);
  }, 120_000);
});
