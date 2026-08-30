/**
 * Step 3 of proposal section 4.3.2 -- Fitness Evaluation.
 *
 *   "The fitness function calculates the number of hard constraint violations (teacher
 *    conflicts, room conflicts, and capacity violations) and applies a penalty for each.
 *    Soft constraints (instructor idle gaps, class distribution evenness) contribute
 *    smaller penalties. The fitness score is computed as: Fitness = 1 / (1 + total_penalty).
 *    A perfect timetable with zero violations achieves a fitness of 1.0."
 *
 * Two implementation notes for the report and the defense:
 *
 * 1. BATCH CONFLICT IS AN ADDITION. The proposal names three hard constraints. A fourth --
 *    a single batch of students being scheduled into two rooms at the same time -- is
 *    indispensable: without it the algorithm happily produces timetables that no student
 *    could physically attend. It is implemented here and documented as a refinement
 *    identified during implementation rather than silently folded in.
 *
 * 2. THE COST IS O(n), NOT O(n^2). The obvious implementation compares every gene with
 *    every other gene to find clashes. At the NFR1 scale that is ~200 genes squared, times
 *    a population of 100, times 1000 generations -- roughly 4 billion comparisons, far
 *    beyond the 120-second budget. Instead each (resource, slot) pair is bucketed into a
 *    counter array and a clash is recorded when a bucket is entered that is already
 *    occupied. Each gene is touched once, so a whole evaluation is linear in the number of
 *    scheduled periods.
 */
import { DAYS, HARD_CONSTRAINT_KEYS, PENALTY_WEIGHTS } from '@schedular/shared';
import type { FitnessBreakdown, ViolationCounts } from '@schedular/shared';
import type { ProblemContext } from './context';
import type { Chromosome } from './types';

const DAYS_IN_WEEK = DAYS.length;
const HARD_KEYS = new Set<string>(HARD_CONSTRAINT_KEYS);

const EMPTY_COUNTS = (): ViolationCounts => ({
  teacherConflict: 0,
  roomConflict: 0,
  batchConflict: 0,
  capacityViolation: 0,
  roomTypeMismatch: 0,
  instructorUnavailable: 0,
  instructorUnqualified: 0,
  instructorIdleGap: 0,
  unevenDistribution: 0,
  batchConsecutiveOverload: 0,
  roomUtilisationImbalance: 0,
});

/**
 * Reusable scratch memory for the occupancy buckets.
 *
 * Allocating fresh arrays per evaluation would create 100,000 large typed arrays over a
 * benchmark run and drown the process in garbage collection. Instead the buffers are
 * allocated once and "cleared" by bumping a stamp counter: a bucket counts as empty when
 * its stamp is stale, which makes clearing O(1) instead of O(size).
 */
class OccupancyScratch {
  private readonly stamp: Int32Array;
  /** Which gene currently holds each cell, so both sides of a clash can be identified. */
  private readonly owner: Int32Array;
  private current = 0;

  constructor(size: number) {
    this.stamp = new Int32Array(size);
    this.owner = new Int32Array(size);
  }

  reset(): void {
    this.current++;
    // Int32 wraps after ~2.1 billion resets; rewind defensively rather than corrupt state.
    if (this.current === 0x7fffffff) {
      this.stamp.fill(0);
      this.current = 1;
    }
  }

  /**
   * Claims a cell for `geneIndex`. Returns the index of the gene already holding it, or
   * -1 when the cell was free. Returning the incumbent lets the caller mark BOTH parties
   * to a clash as conflicted -- repairing only the second arrival would leave the repair
   * operator blind to half the genes it could usefully move.
   */
  occupy(cell: number, geneIndex: number): number {
    if (this.stamp[cell] === this.current) return this.owner[cell];
    this.stamp[cell] = this.current;
    this.owner[cell] = geneIndex;
    return -1;
  }
}

export class FitnessEvaluator {
  private readonly ctx: ProblemContext;
  private readonly teacherSlots: OccupancyScratch;
  private readonly roomSlots: OccupancyScratch;
  private readonly batchSlots: OccupancyScratch;

  /** Per-instructor, per-day occupancy bitmap, reused for the idle-gap soft constraint. */
  private readonly instructorDayGrid: Uint8Array;
  private readonly batchDayGrid: Uint8Array;
  private readonly batchDayCount: Int32Array;
  private readonly roomUsage: Int32Array;
  /** batch x slot -> courseIndex + 1, used to detect the same subject twice in a row. */
  private readonly batchSlotCourse: Int32Array;

  /**
   * Genes involved in at least one hard-constraint violation in the most recent
   * evaluation. Populated only when `evaluate` is called with `collectConflicts`, so the
   * hot path in the main loop pays nothing for a feature only the repair operator uses.
   */
  private readonly conflictFlag: Uint8Array;
  private conflicted: number[] = [];
  private collecting = false;

  constructor(ctx: ProblemContext) {
    this.ctx = ctx;
    const slots = ctx.slotCount;
    this.teacherSlots = new OccupancyScratch(ctx.instructors.length * slots);
    this.roomSlots = new OccupancyScratch(ctx.rooms.length * slots);
    this.batchSlots = new OccupancyScratch(ctx.batches.length * slots);
    this.instructorDayGrid = new Uint8Array(ctx.instructors.length * slots);
    this.batchDayGrid = new Uint8Array(ctx.batches.length * slots);
    this.batchDayCount = new Int32Array(ctx.batches.length * DAYS_IN_WEEK);
    this.roomUsage = new Int32Array(ctx.rooms.length);
    this.batchSlotCourse = new Int32Array(ctx.batches.length * slots);
    this.conflictFlag = new Uint8Array(ctx.requirements.length);
  }

  /** Gene indices implicated in a hard violation during the last collecting evaluation. */
  get conflictedGenes(): readonly number[] {
    return this.conflicted;
  }

  private flag(geneIndex: number): void {
    if (geneIndex < 0 || !this.collecting) return;
    if (this.conflictFlag[geneIndex]) return;
    this.conflictFlag[geneIndex] = 1;
    this.conflicted.push(geneIndex);
  }

  /** Full evaluation with the per-category breakdown used by the UI and the report. */
  evaluate(chromosome: Chromosome, collectConflicts = false): FitnessBreakdown {
    const ctx = this.ctx;
    this.collecting = collectConflicts;
    if (collectConflicts) {
      this.conflictFlag.fill(0);
      this.conflicted = [];
    }
    const counts = EMPTY_COUNTS();
    const slots = ctx.slotCount;

    this.teacherSlots.reset();
    this.roomSlots.reset();
    this.batchSlots.reset();
    this.instructorDayGrid.fill(0);
    this.batchDayGrid.fill(0);
    this.batchDayCount.fill(0);
    this.roomUsage.fill(0);
    this.batchSlotCourse.fill(0);

    // ---------------------------------------------------------------- hard constraints
    for (let i = 0; i < chromosome.length; i++) {
      const gene = chromosome[i];
      const req = ctx.requirements[i];
      const { instructorIndex, roomIndex, startSlot } = gene;
      const room = ctx.rooms[roomIndex];
      const batch = ctx.batches[req.batchIndex];

      // Attribute checks are per-session, not per-period.
      if (room.capacity < batch.studentCount) {
        counts.capacityViolation++;
        this.flag(i);
      }
      if (req.sessionType === 'LAB' && room.type !== 'LAB') {
        counts.roomTypeMismatch++;
        this.flag(i);
      }
      if (!ctx.isQualified(instructorIndex, req.courseIndex)) {
        counts.instructorUnqualified++;
        this.flag(i);
      }

      // Occupancy checks are per-period, so a two-period lab is tested in both of its hours.
      for (let d = 0; d < req.duration; d++) {
        const slot = startSlot + d;
        if (slot >= slots || Math.floor(slot / ctx.periodsPerDay) !== Math.floor(startSlot / ctx.periodsPerDay)) {
          // A session running past the end of the day is treated as a room clash: it
          // cannot be timetabled. Construction prevents this; the guard keeps the
          // evaluator total for hand-built test chromosomes.
          counts.roomConflict++;
          this.flag(i);
          continue;
        }

        if (!ctx.isAvailable(instructorIndex, slot)) {
          counts.instructorUnavailable++;
          this.flag(i);
        }

        const teacherIncumbent = this.teacherSlots.occupy(instructorIndex * slots + slot, i);
        if (teacherIncumbent >= 0) {
          counts.teacherConflict++;
          this.flag(i);
          this.flag(teacherIncumbent);
        }

        const roomIncumbent = this.roomSlots.occupy(roomIndex * slots + slot, i);
        if (roomIncumbent >= 0) {
          counts.roomConflict++;
          this.flag(i);
          this.flag(roomIncumbent);
        }

        const batchIncumbent = this.batchSlots.occupy(req.batchIndex * slots + slot, i);
        if (batchIncumbent >= 0) {
          counts.batchConflict++;
          this.flag(i);
          this.flag(batchIncumbent);
        }

        this.instructorDayGrid[instructorIndex * slots + slot] = 1;
        this.batchDayGrid[req.batchIndex * slots + slot] = 1;
        this.batchDayCount[req.batchIndex * DAYS_IN_WEEK + Math.floor(slot / ctx.periodsPerDay)]++;
        this.batchSlotCourse[req.batchIndex * slots + slot] = req.courseIndex + 1;
        this.roomUsage[roomIndex]++;
      }
    }

    // ---------------------------------------------------------------- soft constraints
    counts.instructorIdleGap = this.countIdleGaps(this.instructorDayGrid, ctx.instructors.length);
    counts.unevenDistribution = this.countUnevenDistribution();
    counts.batchConsecutiveOverload = this.countRepeatedSubjectRuns();
    counts.roomUtilisationImbalance = this.countRoomImbalance();

    return this.score(counts);
  }

  /** Converts raw violation counts into the proposal's fitness formula. */
  score(counts: ViolationCounts): FitnessBreakdown {
    let hardPenalty = 0;
    let softPenalty = 0;
    let hardViolations = 0;
    let softViolations = 0;

    for (const key of Object.keys(counts) as (keyof ViolationCounts)[]) {
      const n = counts[key];
      if (n === 0) continue;
      const weighted = n * PENALTY_WEIGHTS[key];
      if (HARD_KEYS.has(key)) {
        hardPenalty += weighted;
        hardViolations += n;
      } else {
        softPenalty += weighted;
        softViolations += n;
      }
    }

    const totalPenalty = hardPenalty + softPenalty;
    return {
      // Proposal Step 3, verbatim: Fitness = 1 / (1 + total_penalty).
      fitness: 1 / (1 + totalPenalty),
      totalPenalty,
      hardPenalty,
      softPenalty,
      hardViolations,
      softViolations,
      counts,
    };
  }

  /**
   * Idle gaps: free periods sandwiched between two taught periods on the same day.
   * A teacher with classes in periods 1 and 5 has three idle hours on campus; a teacher
   * with classes in periods 1 and 2 has none.
   */
  private countIdleGaps(grid: Uint8Array, entityCount: number): number {
    const { periodsPerDay, slotCount } = this.ctx;
    let gaps = 0;
    for (let e = 0; e < entityCount; e++) {
      const base = e * slotCount;
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const dayBase = base + day * periodsPerDay;
        let first = -1;
        let last = -1;
        let taught = 0;
        for (let p = 0; p < periodsPerDay; p++) {
          if (grid[dayBase + p]) {
            if (first === -1) first = p;
            last = p;
            taught++;
          }
        }
        if (first !== -1) gaps += last - first + 1 - taught;
      }
    }
    return gaps;
  }

  /**
   * Distribution evenness: how far each batch's daily load strays from a flat spread.
   * A batch with all fifteen weekly lectures crammed into two days scores badly even
   * though it breaks no hard constraint.
   */
  private countUnevenDistribution(): number {
    const batches = this.ctx.batches.length;
    let penalty = 0;
    for (let b = 0; b < batches; b++) {
      let total = 0;
      for (let day = 0; day < DAYS_IN_WEEK; day++) total += this.batchDayCount[b * DAYS_IN_WEEK + day];
      if (total === 0) continue;
      const mean = total / DAYS_IN_WEEK;
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        penalty += Math.abs(this.batchDayCount[b * DAYS_IN_WEEK + day] - mean);
      }
    }
    return Math.round(penalty);
  }

  /**
   * Proposal objective 3 asks the schedule to avoid "scheduling back-to-back lectures for
   * the same batch when possible". Read literally that would penalise any two consecutive
   * periods, which would leave students with gaps all day and is not what any timetable
   * office wants. The operative reading -- and the one implemented here -- is that the
   * SAME SUBJECT should not run in consecutive periods for a batch, which is the
   * repetition students actually complain about. The interpretation is recorded in the
   * report so the panel can see the deviation was deliberate.
   */
  private countRepeatedSubjectRuns(): number {
    const { periodsPerDay, slotCount } = this.ctx;
    const batches = this.ctx.batches.length;
    let penalty = 0;
    for (let b = 0; b < batches; b++) {
      const base = b * slotCount;
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const dayBase = base + day * periodsPerDay;
        for (let p = 1; p < periodsPerDay; p++) {
          const prev = this.batchSlotCourse[dayBase + p - 1];
          const curr = this.batchSlotCourse[dayBase + p];
          if (prev !== 0 && prev === curr) penalty++;
        }
      }
    }
    // Labs legitimately occupy two consecutive periods of the same course; discount one
    // run per lab session so the soft constraint does not fight a hard requirement.
    const labSessions = this.ctx.requirements.reduce((n, r) => n + (r.duration > 1 ? 1 : 0), 0);
    return Math.max(0, penalty - labSessions);
  }

  /** Spread of teaching load across rooms, so a few rooms are not run ragged. */
  private countRoomImbalance(): number {
    const rooms = this.ctx.rooms.length;
    if (rooms === 0) return 0;
    let total = 0;
    for (let r = 0; r < rooms; r++) total += this.roomUsage[r];
    const mean = total / rooms;
    let penalty = 0;
    for (let r = 0; r < rooms; r++) penalty += Math.abs(this.roomUsage[r] - mean);
    return Math.round(penalty / 2);
  }
}
