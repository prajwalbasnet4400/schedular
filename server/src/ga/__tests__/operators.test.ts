/**
 * Tests for the four genetic operators of proposal section 4.3.2, Steps 2 and 4-6.
 * Each test states the property the defense will be asked about.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../rng';
import { createInitialPopulation, createRandomChromosome, cloneChromosome } from '../population';
import { tournamentSelect } from '../selection';
import { singlePointCrossover } from '../crossover';
import { mutate } from '../mutation';
import { tinyContext, labContext } from './fixtures';
import type { Chromosome, Individual } from '../types';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 50 }, ((r) => () => r.next())(new Rng(1)));
    const b = Array.from({ length: 50 }, ((r) => () => r.next())(new Rng(2)));
    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Population initialization (Step 2)', () => {
  it('creates exactly one gene per required session', () => {
    const ctx = tinyContext();
    const chromosome = createRandomChromosome(ctx, new Rng(1));
    expect(chromosome).toHaveLength(ctx.requirements.length);
    // 2 batches x 2 courses x 2 lectures.
    expect(ctx.requirements).toHaveLength(8);
  });

  it('expands a course requiring three lectures into three separate genes', () => {
    const ctx = tinyContext({
      courses: [{ id: 'c1', code: 'C1', name: 'One', lecturesPerWeek: 3, labsPerWeek: 0, type: 'LECTURE' }],
      batches: [{ id: 'b1', label: 'B1', studentCount: 30, courseIds: ['c1'] }],
    });
    expect(ctx.requirements).toHaveLength(3);
  });

  it('creates the requested population size', () => {
    const ctx = tinyContext();
    expect(createInitialPopulation(ctx, new Rng(1), 100)).toHaveLength(100);
  });

  it('only ever assigns a qualified teacher, a valid room and a valid slot', () => {
    const ctx = tinyContext();
    const rng = new Rng(99);
    for (const chromosome of createInitialPopulation(ctx, rng, 200)) {
      chromosome.forEach((gene, i) => {
        const req = ctx.requirements[i];
        expect(req.eligibleInstructors).toContain(gene.instructorIndex);
        expect(req.eligibleRooms).toContain(gene.roomIndex);
        expect(req.eligibleStartSlots).toContain(gene.startSlot);
      });
    }
  });
});

describe('Tournament selection (Step 4)', () => {
  const individual = (fitness: number): Individual => ({
    chromosome: [],
    fitness,
    hardViolations: 0,
    softViolations: 0,
  });

  it('never returns an individual that lost its tournament', () => {
    const population = [0.1, 0.2, 0.3, 0.4, 0.9].map(individual);
    const rng = new Rng(5);
    for (let i = 0; i < 500; i++) {
      const winner = tournamentSelect(population, 5, rng);
      expect(population).toContain(winner);
    }
  });

  it('applies selection pressure: fitter individuals win more often', () => {
    const population = Array.from({ length: 20 }, (_, i) => individual(i / 20));
    const rng = new Rng(11);
    let total = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) total += tournamentSelect(population, 5, rng).fitness;
    const meanWinner = total / trials;
    const meanPopulation = population.reduce((s, p) => s + p.fitness, 0) / population.length;
    expect(meanWinner).toBeGreaterThan(meanPopulation);
  });

  it('applies more pressure as k grows', () => {
    const population = Array.from({ length: 50 }, (_, i) => individual(i / 50));
    const meanFor = (k: number) => {
      const rng = new Rng(3);
      let total = 0;
      for (let i = 0; i < 4000; i++) total += tournamentSelect(population, k, rng).fitness;
      return total / 4000;
    };
    expect(meanFor(10)).toBeGreaterThan(meanFor(2));
  });

  it('with k = 1 degenerates to random selection, applying no pressure', () => {
    const population = Array.from({ length: 50 }, (_, i) => individual(i / 50));
    const rng = new Rng(3);
    let total = 0;
    for (let i = 0; i < 5000; i++) total += tournamentSelect(population, 1, rng).fitness;
    const meanPopulation = population.reduce((s, p) => s + p.fitness, 0) / population.length;
    expect(total / 5000).toBeCloseTo(meanPopulation, 1);
  });
});

describe('Single-point crossover (Step 5)', () => {
  it('preserves chromosome length, so no requirement is lost or duplicated', () => {
    const ctx = tinyContext();
    const rng = new Rng(2);
    const a = createRandomChromosome(ctx, rng);
    const b = createRandomChromosome(ctx, rng);
    for (let i = 0; i < 100; i++) {
      expect(singlePointCrossover(a, b, rng)).toHaveLength(a.length);
    }
  });

  it('takes every gene from one parent or the other, never inventing one', () => {
    const ctx = tinyContext();
    const rng = new Rng(4);
    const a = createRandomChromosome(ctx, rng);
    const b = createRandomChromosome(ctx, rng);
    const child = singlePointCrossover(a, b, rng);
    child.forEach((gene, i) => {
      const fromA = JSON.stringify(gene) === JSON.stringify(a[i]);
      const fromB = JSON.stringify(gene) === JSON.stringify(b[i]);
      expect(fromA || fromB).toBe(true);
    });
  });

  it('produces a prefix from parent A and a suffix from parent B', () => {
    const ctx = tinyContext();
    const rng = new Rng(6);
    const a = createRandomChromosome(ctx, rng);
    const b = createRandomChromosome(ctx, rng);
    const child = singlePointCrossover(a, b, rng);

    // Find the crossover point: the first index taken from B.
    let point = child.length;
    for (let i = 0; i < child.length; i++) {
      if (JSON.stringify(child[i]) !== JSON.stringify(a[i])) {
        point = i;
        break;
      }
    }
    for (let i = point; i < child.length; i++) {
      expect(child[i]).toEqual(b[i]);
    }
  });

  it('does not alias its parents: mutating the child leaves them untouched', () => {
    const ctx = tinyContext();
    const rng = new Rng(8);
    const a = createRandomChromosome(ctx, rng);
    const b = createRandomChromosome(ctx, rng);
    const snapshot = JSON.stringify([a, b]);
    const child = singlePointCrossover(a, b, rng);
    child[0].startSlot = 999;
    expect(JSON.stringify([a, b])).toBe(snapshot);
  });
});

describe('Mutation (Step 6)', () => {
  it('only ever produces values from the eligible sets', () => {
    const ctx = tinyContext();
    const rng = new Rng(13);
    const chromosome = createRandomChromosome(ctx, rng);
    for (let round = 0; round < 500; round++) {
      mutate(chromosome, ctx, 1, rng);
      chromosome.forEach((gene, i) => {
        const req = ctx.requirements[i];
        expect(req.eligibleInstructors).toContain(gene.instructorIndex);
        expect(req.eligibleRooms).toContain(gene.roomIndex);
        expect(req.eligibleStartSlots).toContain(gene.startSlot);
      });
    }
  });

  it('never places a two-period lab in the final period of a day', () => {
    const ctx = labContext();
    const rng = new Rng(21);
    const chromosome = createRandomChromosome(ctx, rng);
    for (let round = 0; round < 500; round++) {
      mutate(chromosome, ctx, 1, rng);
      chromosome.forEach((gene, i) => {
        const req = ctx.requirements[i];
        if (req.duration > 1) {
          const period = gene.startSlot % ctx.periodsPerDay;
          expect(period + req.duration).toBeLessThanOrEqual(ctx.periodsPerDay);
        }
      });
    }
  });

  it('changes nothing at rate 0 and changes something at rate 1', () => {
    const ctx = tinyContext();
    const rng = new Rng(17);
    const chromosome = createRandomChromosome(ctx, rng);

    const before = JSON.stringify(chromosome);
    mutate(chromosome, ctx, 0, rng);
    expect(JSON.stringify(chromosome)).toBe(before);

    // At rate 1 with several eligible values per gene, an 8-gene chromosome changing not
    // at all is vanishingly unlikely; retry a few times to keep the test non-flaky.
    let changed = false;
    for (let i = 0; i < 20 && !changed; i++) {
      const copy = cloneChromosome(chromosome);
      mutate(copy, ctx, 1, rng);
      changed = JSON.stringify(copy) !== JSON.stringify(chromosome);
    }
    expect(changed).toBe(true);
  });
});
