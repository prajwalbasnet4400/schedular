/** Response payloads exchanged over the REST API. */
import type { Assignment, Batch, Course, Instructor, MeetingTime, Program, Room, RunStatus, UserRole } from './domain';
import type { FitnessBreakdown, GAConfig, GenerationProgress } from './ga';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * Result of the pre-flight feasibility check (NFR4): "The system shall provide meaningful
 * error messages when the input data makes a feasible schedule impossible."
 */
export interface FeasibilityReport {
  feasible: boolean;
  errors: FeasibilityIssue[];
  warnings: FeasibilityIssue[];
  stats: {
    requiredSessions: number;
    availableRoomSlots: number;
    utilisationRatio: number;
    batches: number;
    courses: number;
    instructors: number;
    rooms: number;
    timeSlots: number;
  };
}

export interface FeasibilityIssue {
  code: string;
  message: string;
  entity?: { type: string; id: string; label: string };
}

export interface ScheduleRunSummary {
  id: string;
  status: RunStatus;
  config: GAConfig;
  bestFitness: number;
  generationsRun: number;
  durationMs: number;
  hardViolations: number;
  softViolations: number;
  createdAt: string;
  createdByName: string;
}

export interface ScheduleRunDetail extends ScheduleRunSummary {
  breakdown: FitnessBreakdown;
  convergence: GenerationProgress[];
  assignments: Assignment[];
  /** Everything the grid needs to render labels without N+1 lookups. */
  reference: {
    courses: Course[];
    instructors: Instructor[];
    rooms: Room[];
    batches: Batch[];
    meetingTimes: MeetingTime[];
    /**
     * Needed to label a batch unambiguously. Every programme runs a "Semester 5A", so
     * "Sem 5A" alone identifies six different cohorts -- which broke both the Excel export
     * (duplicate worksheet names) and the on-screen filter (indistinguishable options).
     */
    programs: Program[];
  };
  message?: string;
}

/** Server-sent event payloads streamed during generation (FR4). */
export type GenerationEvent =
  | { type: 'started'; runId: string; totalSessions: number }
  | { type: 'progress'; runId: string; progress: GenerationProgress }
  | { type: 'completed'; runId: string; bestFitness: number; generationsRun: number; durationMs: number }
  | { type: 'failed'; runId: string; message: string };

export type TimetableView = 'batch' | 'teacher' | 'room';
