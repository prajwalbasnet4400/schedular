/**
 * Core domain vocabulary for the Automated College Timetable Generator.
 *
 * These types are the single source of truth shared by the Express backend and the
 * React frontend. Proposal section 4.2.1 justifies the Node.js choice on exactly this
 * basis: "the entire stack uses a single language (TypeScript), enabling code sharing
 * between frontend and backend for type definitions of scheduling entities."
 */

/** Teaching days of the Nepali academic week. Saturday is a public holiday. */
export const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
export type Day = (typeof DAYS)[number];

/** Number of 1-hour periods in the TU morning shift (06:30 - 12:30). */
export const PERIODS_PER_DAY = 6;

/** Total addressable slots in one week. */
export const SLOTS_PER_WEEK = DAYS.length * PERIODS_PER_DAY;

export type RoomType = 'LECTURE_HALL' | 'LAB';
export type CourseType = 'LECTURE' | 'LAB';
export type SessionType = 'LECTURE' | 'LAB';
export type UserRole = 'ADMIN' | 'VIEWER';
export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INFEASIBLE';

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  totalSemesters: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  creditHours: number;
  /** Weekly 1-hour lecture sessions required. Each becomes one gene. */
  lecturesPerWeek: number;
  /** Weekly lab sessions required. Each lab occupies two consecutive periods. */
  labsPerWeek: number;
  type: CourseType;
  departmentId: string;
}

export interface Instructor {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  /** Course ids this instructor is qualified to teach. */
  qualifiedCourseIds: string[];
  /** MeetingTime ids the instructor has declared themselves available for. */
  availableSlotIds: string[];
}

export interface Room {
  id: string;
  number: string;
  building: string;
  capacity: number;
  type: RoomType;
}

export interface Batch {
  id: string;
  programId: string;
  semester: number;
  section: string;
  studentCount: number;
  /** Courses this batch takes in the current semester. */
  courseIds: string[];
}

export interface MeetingTime {
  id: string;
  day: Day;
  /** 1-based period index within the day. */
  period: number;
  startTime: string;
  endTime: string;
}

/**
 * One decoded gene: a single class session placed in the week.
 * Proposal section 4.3.2 Step 1: "Each gene in the chromosome encodes a single class
 * session as a tuple of (Course, Teacher, Room, Time Slot, Batch)."
 */
export interface Assignment {
  courseId: string;
  instructorId: string;
  roomId: string;
  meetingTimeId: string;
  batchId: string;
  sessionType: SessionType;
  /**
   * Groups the genes of a multi-period session (a lab spans two consecutive periods).
   * Genes sharing a group are relocated atomically by mutation and crossover.
   */
  sessionGroupId: string;
}
