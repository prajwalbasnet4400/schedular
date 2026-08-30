/** Internal representation used by the Genetic Algorithm engine. */
import type { SessionType } from '@schedular/shared';

/**
 * One class session that must be placed somewhere in the week.
 *
 * The requirement list is derived once from the institutional data and never changes
 * during a run. Because it is fixed and ordered, a chromosome can be a plain array whose
 * i-th gene always answers "where does requirement i go?" -- which is what makes the
 * single-point crossover of proposal Step 5 valid without any repair step.
 */
export interface SessionRequirement {
  index: number;
  courseIndex: number;
  batchIndex: number;
  sessionType: SessionType;
  /** Consecutive periods this session occupies. Lectures are 1, labs are 2. */
  duration: number;
  /** Instructor indices qualified to teach this course. Never empty (feasibility-checked). */
  eligibleInstructors: number[];
  /** Room indices of the correct type and sufficient capacity. May be empty -> infeasible. */
  eligibleRooms: number[];
  /** Slot indices this session may start at, honouring the duration. */
  eligibleStartSlots: number[];
  /** Stable identifier grouping the periods of a multi-period session. */
  sessionGroupId: string;
}

/**
 * A gene: the placement chosen for one requirement.
 *
 * Proposal section 4.3.2 Step 1 defines a gene as the tuple
 * (Course, Teacher, Room, Time Slot, Batch). Course and Batch are fixed by the
 * requirement at this index, so only the three free variables are stored -- the decoded
 * gene emitted to the API carries all five fields exactly as the proposal specifies.
 */
export interface Gene {
  instructorIndex: number;
  roomIndex: number;
  /** Index into the flattened week: dayIndex * PERIODS_PER_DAY + (period - 1). */
  startSlot: number;
}

/** A candidate timetable: one gene per requirement, in requirement order. */
export type Chromosome = Gene[];

/** A chromosome paired with its cached evaluation. */
export interface Individual {
  chromosome: Chromosome;
  fitness: number;
  hardViolations: number;
  softViolations: number;
}
