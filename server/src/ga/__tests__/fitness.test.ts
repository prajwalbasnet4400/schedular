/**
 * Tests for the fitness function -- the component the defense will question most closely,
 * because every claim the project makes about correctness reduces to "the fitness function
 * counts violations correctly".
 */
import { describe, expect, it } from 'vitest';
import { FitnessEvaluator } from '../fitness';
import { tinyContext, labContext, perfectContext, ALL_SLOT_IDS, buildMeetingTimes } from './fixtures';
import type { Chromosome } from '../types';

describe('FitnessEvaluator', () => {
  it('returns exactly 1.0 for a flawless timetable, as proposal Step 3 requires', () => {
    const ctx = perfectContext();
    const evaluator = new FitnessEvaluator(ctx);

    // Six lectures, one on each day of the week, all in period 1.
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      roomIndex: 0,
      startSlot: i * ctx.periodsPerDay,
    }));

    const result = evaluator.evaluate(chromosome);
    expect(result.hardViolations).toBe(0);
    expect(result.softViolations).toBe(0);
    expect(result.totalPenalty).toBe(0);
    // "A perfect timetable with zero violations achieves a fitness of 1.0."
    expect(result.fitness).toBe(1);
  });

  it('assigns zero hard violations to a well-formed multi-batch timetable', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);

    // Each batch gets its own room and its own instructor; within a batch the four
    // sessions occupy four distinct consecutive slots.
    const chromosome: Chromosome = ctx.requirements.map((req, i) => ({
      instructorIndex: req.batchIndex,
      roomIndex: req.batchIndex,
      startSlot: i % 4,
    }));

    const result = evaluator.evaluate(chromosome);
    expect(result.hardViolations).toBe(0);
    expect(result.counts.teacherConflict).toBe(0);
    expect(result.counts.roomConflict).toBe(0);
    expect(result.counts.batchConflict).toBe(0);
    // Soft penalties remain (everything is crammed into one day), so fitness is below 1.
    expect(result.fitness).toBeLessThan(1);
    expect(result.fitness).toBe(1 / (1 + result.totalPenalty));
  });

  it('implements the proposal formula Fitness = 1 / (1 + total_penalty)', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);
    const chromosome: Chromosome = ctx.requirements.map(() => ({
      instructorIndex: 0,
      roomIndex: 0,
      startSlot: 0,
    }));

    const result = evaluator.evaluate(chromosome);
    expect(result.fitness).toBeCloseTo(1 / (1 + result.totalPenalty), 12);
    expect(result.fitness).toBeGreaterThan(0);
    expect(result.fitness).toBeLessThanOrEqual(1);
  });

  it('detects teacher double-booking', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);
    // Two sessions, same instructor, same slot, different rooms and batches.
    const chromosome: Chromosome = ctx.requirements.map((req, i) => ({
      instructorIndex: 0,
      roomIndex: i % 2,
      startSlot: req.batchIndex === 0 && i < 2 ? 0 : 10 + i,
    }));
    const result = evaluator.evaluate(chromosome);
    expect(result.counts.teacherConflict).toBeGreaterThan(0);
  });

  it('detects room double-booking', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);
    // Everything in room 0 at slot 0.
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: i % 2,
      roomIndex: 0,
      startSlot: 0,
    }));
    const result = evaluator.evaluate(chromosome);
    expect(result.counts.roomConflict).toBeGreaterThan(0);
  });

  it('detects batch double-booking (the constraint added beyond the proposal)', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);
    // Batch 0's four sessions all at slot 0, in distinct rooms with distinct teachers
    // where possible -- so the ONLY thing wrong is that one batch is in two places.
    const chromosome: Chromosome = ctx.requirements.map((req, i) => ({
      instructorIndex: i % 2,
      roomIndex: i % 2,
      startSlot: req.batchIndex === 0 ? 0 : 20 + i,
    }));
    const result = evaluator.evaluate(chromosome);
    expect(result.counts.batchConflict).toBeGreaterThan(0);
  });

  it('detects room capacity overflow', () => {
    const ctx = tinyContext({
      rooms: [
        { id: 'r1', number: 'R1', capacity: 10, type: 'LECTURE_HALL' },
        { id: 'r2', number: 'R2', capacity: 10, type: 'LECTURE_HALL' },
      ],
    });
    const evaluator = new FitnessEvaluator(ctx);
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      roomIndex: 0,
      startSlot: i,
    }));
    // Batches hold 30 students, rooms seat 10.
    expect(evaluator.evaluate(chromosome).counts.capacityViolation).toBe(ctx.requirements.length);
  });

  it('detects a lab scheduled into a lecture hall', () => {
    const ctx = labContext();
    const evaluator = new FitnessEvaluator(ctx);
    const labIndex = ctx.requirements.findIndex((r) => r.sessionType === 'LAB');
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      // Force the lab into room 0, which is a LECTURE_HALL.
      roomIndex: 0,
      startSlot: i * 2,
    }));
    expect(labIndex).toBeGreaterThanOrEqual(0);
    expect(evaluator.evaluate(chromosome).counts.roomTypeMismatch).toBe(1);
  });

  it('detects an instructor scheduled outside their declared availability', () => {
    // Instructor 0 is available only for the first slot of the week.
    const ctx = tinyContext({
      instructors: [
        { id: 'i1', name: 'Part Timer', qualifiedCourseIds: ['c1', 'c2'], availableSlotIds: [ALL_SLOT_IDS[0]] },
        { id: 'i2', name: 'Full Timer', qualifiedCourseIds: ['c1', 'c2'], availableSlotIds: ALL_SLOT_IDS },
      ],
    });
    const evaluator = new FitnessEvaluator(ctx);
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      roomIndex: i % 2,
      startSlot: 5 + i,
    }));
    expect(evaluator.evaluate(chromosome).counts.instructorUnavailable).toBe(ctx.requirements.length);
  });

  it('detects an instructor teaching a course they are not qualified for', () => {
    const ctx = tinyContext({
      instructors: [
        { id: 'i1', name: 'One', qualifiedCourseIds: ['c1'], availableSlotIds: ALL_SLOT_IDS },
        { id: 'i2', name: 'Two', qualifiedCourseIds: ['c1', 'c2'], availableSlotIds: ALL_SLOT_IDS },
      ],
    });
    const evaluator = new FitnessEvaluator(ctx);
    // Instructor 0 is not qualified for c2; assign them to everything.
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      roomIndex: i % 2,
      startSlot: i,
    }));
    const c2Sessions = ctx.requirements.filter((r) => ctx.courses[r.courseIndex].id === 'c2').length;
    expect(evaluator.evaluate(chromosome).counts.instructorUnqualified).toBe(c2Sessions);
  });

  it('checks both periods of a two-period lab for clashes', () => {
    const ctx = labContext();
    const evaluator = new FitnessEvaluator(ctx);
    const labIndex = ctx.requirements.findIndex((r) => r.sessionType === 'LAB');
    const lectureIndex = ctx.requirements.findIndex((r) => r.sessionType === 'LECTURE');

    const chromosome: Chromosome = ctx.requirements.map(() => ({
      instructorIndex: 0,
      roomIndex: 1,
      startSlot: 0,
    }));
    // Lab starts at slot 0 and therefore also occupies slot 1.
    chromosome[labIndex] = { instructorIndex: 0, roomIndex: 1, startSlot: 0 };
    // The lecture sits in slot 1 -- the lab's SECOND period. A naive evaluator that only
    // looked at start slots would call this conflict-free.
    chromosome[lectureIndex] = { instructorIndex: 0, roomIndex: 1, startSlot: 1 };

    const result = evaluator.evaluate(chromosome);
    expect(result.counts.roomConflict).toBeGreaterThan(0);
  });

  it('counts instructor idle gaps but not leading or trailing free periods', () => {
    const ctx = tinyContext({
      courses: [{ id: 'c1', code: 'C1', name: 'One', lecturesPerWeek: 2, labsPerWeek: 0, type: 'LECTURE' }],
      batches: [{ id: 'b1', label: 'B1', studentCount: 30, courseIds: ['c1'] }],
      meetingTimes: buildMeetingTimes(),
    });
    const evaluator = new FitnessEvaluator(ctx);

    // Same instructor teaching periods 1 and 4 of Sunday: two idle hours in between.
    const gapped: Chromosome = [
      { instructorIndex: 0, roomIndex: 0, startSlot: 0 },
      { instructorIndex: 0, roomIndex: 0, startSlot: 3 },
    ];
    // Adjacent periods: no gap.
    const adjacent: Chromosome = [
      { instructorIndex: 0, roomIndex: 0, startSlot: 0 },
      { instructorIndex: 0, roomIndex: 0, startSlot: 1 },
    ];

    expect(evaluator.evaluate(gapped).counts.instructorIdleGap).toBe(2);
    expect(evaluator.evaluate(adjacent).counts.instructorIdleGap).toBe(0);
  });

  it('reports the genes involved in a clash, on both sides', () => {
    const ctx = tinyContext();
    const evaluator = new FitnessEvaluator(ctx);
    const chromosome: Chromosome = ctx.requirements.map((_, i) => ({
      instructorIndex: 0,
      roomIndex: 0,
      startSlot: i < 2 ? 0 : 10 + i,
    }));

    evaluator.evaluate(chromosome, true);
    const conflicted = evaluator.conflictedGenes;
    // Genes 0 and 1 collide; the incumbent (0) must be reported as well as the arrival (1).
    expect(conflicted).toContain(0);
    expect(conflicted).toContain(1);
  });
});
