/**
 * End-to-end tests of the evolutionary loop, plus the property-based guarantee that backs
 * Expected Outcome 1: "there will be zero instances of teacher double-booking, room
 * double-booking, or room capacity overflow."
 */
import { describe, expect, it } from 'vitest';
import { GeneticAlgorithm } from '../engine';
import { FitnessEvaluator } from '../fitness';
import { decodeChromosome } from '../decode';
import { ProblemContext } from '../context';
import { Rng } from '../rng';
import { tinyContext, labContext, perfectContext, ALL_SLOT_IDS, buildMeetingTimes } from './fixtures';

/**
 * A medium instance with real contention: 6 batches, 4 courses each, 6 instructors,
 * 5 rooms. Large enough that a random chromosome is always badly broken, small enough to
 * run many times inside a test suite.
 */
function mediumContext(seed = 1): ProblemContext {
  const rng = new Rng(seed);
  const courses = Array.from({ length: 8 }, (_, i) => ({
    id: `c${i}`,
    code: `C${i}`,
    name: `Course ${i}`,
    lecturesPerWeek: 3,
    labsPerWeek: i % 4 === 0 ? 1 : 0,
    type: (i % 4 === 0 ? 'LAB' : 'LECTURE') as 'LAB' | 'LECTURE',
  }));

  const instructors = Array.from({ length: 6 }, (_, i) => ({
    id: `i${i}`,
    name: `Instructor ${i}`,
    // Each instructor covers a rotating window of courses, so every course has 3 candidates.
    qualifiedCourseIds: [0, 1, 2, 3].map((k) => `c${(i + k * 2) % 8}`),
    availableSlotIds: ALL_SLOT_IDS,
  }));

  const rooms = [
    { id: 'r0', number: 'R0', capacity: 60, type: 'LECTURE_HALL' as const },
    { id: 'r1', number: 'R1', capacity: 60, type: 'LECTURE_HALL' as const },
    { id: 'r2', number: 'R2', capacity: 60, type: 'LECTURE_HALL' as const },
    { id: 'r3', number: 'R3', capacity: 60, type: 'LAB' as const },
    { id: 'r4', number: 'R4', capacity: 60, type: 'LAB' as const },
  ];

  const batches = Array.from({ length: 6 }, (_, i) => ({
    id: `b${i}`,
    label: `Batch ${i}`,
    studentCount: 30 + rng.int(20),
    courseIds: [0, 1, 2, 3].map((k) => `c${(i + k) % 8}`),
  }));

  return new ProblemContext({ courses, instructors, rooms, batches, meetingTimes: buildMeetingTimes() });
}

describe('GeneticAlgorithm', () => {
  it('terminates immediately when a flawless timetable is reachable (fitness 1.0)', () => {
    const ctx = perfectContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 40, maxGenerations: 500, seed: 1 }).run();
    expect(result.perfect).toBe(true);
    expect(result.breakdown.fitness).toBe(1);
    expect(result.terminationReason).toBe('perfect-fitness');
  });

  it('finds a conflict-free timetable for a small instance', () => {
    const ctx = tinyContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 50, maxGenerations: 300, seed: 3 }).run();
    expect(result.solved).toBe(true);
    expect(result.breakdown.hardViolations).toBe(0);
  });

  it('finds a conflict-free timetable for a contended medium instance', () => {
    const ctx = mediumContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 60, maxGenerations: 400, seed: 5 }).run();
    expect(result.solved).toBe(true);
    expect(result.breakdown.counts.teacherConflict).toBe(0);
    expect(result.breakdown.counts.roomConflict).toBe(0);
    expect(result.breakdown.counts.batchConflict).toBe(0);
    expect(result.breakdown.counts.capacityViolation).toBe(0);
  });

  it('is fully reproducible: the same seed yields the same timetable', () => {
    const ctx = mediumContext();
    const config = { populationSize: 40, maxGenerations: 120, seed: 1234 };
    const a = new GeneticAlgorithm(ctx, config).run();
    const b = new GeneticAlgorithm(ctx, config).run();
    expect(a.breakdown.fitness).toBe(b.breakdown.fitness);
    expect(a.generationsRun).toBe(b.generationsRun);
    expect(a.best).toEqual(b.best);
  });

  it('improves monotonically: best fitness never decreases (elitism holds)', () => {
    const ctx = mediumContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 50, maxGenerations: 200, seed: 9 }).run();
    for (let i = 1; i < result.convergence.length; i++) {
      expect(result.convergence[i].bestFitness).toBeGreaterThanOrEqual(result.convergence[i - 1].bestFitness);
    }
  });

  it('records a convergence sample per generation, for the report figure', () => {
    const ctx = tinyContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 20, maxGenerations: 30, seed: 2 }).run({
      progressInterval: 1,
    });
    expect(result.convergence.length).toBeGreaterThan(0);
    expect(result.convergence.length).toBeLessThanOrEqual(result.generationsRun);
    expect(result.convergence[0].generation).toBe(1);
  });

  it('honours the generation ceiling', () => {
    const ctx = mediumContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 20, maxGenerations: 7, seed: 4 }).run();
    expect(result.generationsRun).toBeLessThanOrEqual(7);
  });

  it('stops when cancelled', () => {
    const ctx = mediumContext();
    let calls = 0;
    const result = new GeneticAlgorithm(ctx, { populationSize: 20, maxGenerations: 500, seed: 4 }).run({
      shouldStop: () => ++calls > 5,
    });
    expect(result.generationsRun).toBeLessThan(500);
    expect(result.terminationReason).toBe('cancelled');
  });

  it('reports the generation at which the first conflict-free timetable appeared', () => {
    const ctx = mediumContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 60, maxGenerations: 400, seed: 5 }).run();
    expect(result.solvedAtGeneration).toBeGreaterThan(0);
    expect(result.solvedAtGeneration).toBeLessThanOrEqual(result.generationsRun);
    expect(result.solvedAtMs).toBeGreaterThanOrEqual(0);
  });

  it('keeps a two-period lab in consecutive periods of a single day', () => {
    const ctx = labContext();
    const result = new GeneticAlgorithm(ctx, { populationSize: 30, maxGenerations: 200, seed: 6 }).run();
    const assignments = decodeChromosome(ctx, result.best);
    const groups = new Map<string, string[]>();
    for (const a of assignments) {
      groups.set(a.sessionGroupId, [...(groups.get(a.sessionGroupId) ?? []), a.meetingTimeId]);
    }
    for (const [groupId, meetingTimeIds] of groups) {
      if (!groupId.includes(':LAB:')) continue;
      expect(meetingTimeIds).toHaveLength(2);
      const slots = meetingTimeIds
        .map((id) => ctx.meetingTimes.findIndex((m) => m.id === id))
        .map((i) => ctx.meetingTimeToSlot[i])
        .sort((a, b) => a - b);
      expect(slots[1] - slots[0]).toBe(1);
      // Both periods must fall on the same day.
      expect(Math.floor(slots[0] / ctx.periodsPerDay)).toBe(Math.floor(slots[1] / ctx.periodsPerDay));
    }
  });
});

describe('Expected Outcome 1 (property-based)', () => {
  /**
   * The strongest evidence the project can offer: across many independent runs with
   * different random seeds and different problem instances, a run that REPORTS zero hard
   * violations must have a decoded timetable that genuinely contains none. This checks the
   * decoded output directly rather than trusting the fitness counter, so a bug in the
   * counter cannot hide a bug in the schedule.
   */
  it('never emits a double-booking in any run that reports success', () => {
    let solvedRuns = 0;

    for (let seed = 1; seed <= 25; seed++) {
      const ctx = mediumContext(seed);
      const result = new GeneticAlgorithm(ctx, {
        populationSize: 50,
        maxGenerations: 300,
        seed: seed * 7717,
      }).run();

      if (!result.solved) continue;
      solvedRuns++;

      const assignments = decodeChromosome(ctx, result.best);
      const teacherSlot = new Set<string>();
      const roomSlot = new Set<string>();
      const batchSlot = new Set<string>();

      for (const a of assignments) {
        const t = `${a.instructorId}@${a.meetingTimeId}`;
        const r = `${a.roomId}@${a.meetingTimeId}`;
        const b = `${a.batchId}@${a.meetingTimeId}`;

        expect(teacherSlot.has(t), `teacher double-booked: ${t}`).toBe(false);
        expect(roomSlot.has(r), `room double-booked: ${r}`).toBe(false);
        expect(batchSlot.has(b), `batch double-booked: ${b}`).toBe(false);

        teacherSlot.add(t);
        roomSlot.add(r);
        batchSlot.add(b);

        // Capacity and room type must hold too.
        const room = ctx.rooms.find((x) => x.id === a.roomId)!;
        const batch = ctx.batches.find((x) => x.id === a.batchId)!;
        expect(room.capacity).toBeGreaterThanOrEqual(batch.studentCount);
        if (a.sessionType === 'LAB') expect(room.type).toBe('LAB');

        // The instructor must be qualified for the course they were given.
        const instructor = ctx.instructors.find((x) => x.id === a.instructorId)!;
        expect(instructor.qualifiedCourseIds).toContain(a.courseId);
      }

      // Every required session must appear in the output -- nothing silently dropped.
      const expectedPeriods = ctx.requirements.reduce((n, r) => n + r.duration, 0);
      expect(assignments).toHaveLength(expectedPeriods);
    }

    // The property is vacuous if nothing ever solved; require a real sample.
    expect(solvedRuns).toBeGreaterThanOrEqual(20);
  });

  it('agrees with an independent recount of violations', () => {
    // Cross-check: the fitness evaluator's counts must match a naive O(n^2) recount.
    const ctx = mediumContext(3);
    const evaluator = new FitnessEvaluator(ctx);
    const rng = new Rng(55);

    for (let trial = 0; trial < 30; trial++) {
      const chromosome = ctx.requirements.map((req) => ({
        instructorIndex: rng.pick(req.eligibleInstructors),
        roomIndex: rng.pick(req.eligibleRooms),
        startSlot: rng.pick(req.eligibleStartSlots),
      }));

      const fast = evaluator.evaluate(chromosome);

      // Naive recount: expand to periods, then compare every pair.
      type Slot = { instructor: number; room: number; batch: number; slot: number };
      const periods: Slot[] = [];
      chromosome.forEach((gene, i) => {
        const req = ctx.requirements[i];
        for (let d = 0; d < req.duration; d++) {
          periods.push({
            instructor: gene.instructorIndex,
            room: gene.roomIndex,
            batch: req.batchIndex,
            slot: gene.startSlot + d,
          });
        }
      });

      let teacher = 0;
      let room = 0;
      let batch = 0;
      for (let a = 0; a < periods.length; a++) {
        for (let b = a + 1; b < periods.length; b++) {
          if (periods[a].slot !== periods[b].slot) continue;
          if (periods[a].instructor === periods[b].instructor) teacher++;
          if (periods[a].room === periods[b].room) room++;
          if (periods[a].batch === periods[b].batch) batch++;
        }
      }

      // The bucketed counter records one violation per collision with an existing
      // occupant, so k sessions sharing a slot yield k-1 -- while the pairwise recount
      // yields k*(k-1)/2. The two agree exactly when no more than two sessions ever
      // collide, and the bucketed count is always the smaller of the two otherwise.
      expect(fast.counts.teacherConflict).toBeLessThanOrEqual(teacher);
      expect(fast.counts.roomConflict).toBeLessThanOrEqual(room);
      expect(fast.counts.batchConflict).toBeLessThanOrEqual(batch);
      // Crucially, they must agree on whether a violation exists at all.
      expect(fast.counts.teacherConflict > 0).toBe(teacher > 0);
      expect(fast.counts.roomConflict > 0).toBe(room > 0);
      expect(fast.counts.batchConflict > 0).toBe(batch > 0);
    }
  });
});
