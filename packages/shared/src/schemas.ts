/**
 * Zod validation schemas shared by both tiers.
 *
 * Proposal section 4.3.1: forms are "validated both client-side (TypeScript type checking)
 * and server-side (Express middleware)". Defining the rules once here means the two
 * validations can never disagree -- the client and the Express middleware import the very
 * same schema object.
 */
import { z } from 'zod';
import { DAYS, PERIODS_PER_DAY } from './domain';

const id = z.string().cuid();
const code = z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9. -]+$/, 'Code may contain letters, digits, dots, spaces and hyphens');
const name = z.string().trim().min(2).max(120);

export const departmentInput = z.object({
  code,
  name,
});

export const programInput = z.object({
  code,
  name,
  departmentId: id,
  totalSemesters: z.number().int().min(1).max(12),
});

export const courseInput = z
  .object({
    code,
    name,
    creditHours: z.number().int().min(1).max(6),
    lecturesPerWeek: z.number().int().min(0).max(10),
    labsPerWeek: z.number().int().min(0).max(5),
    type: z.enum(['LECTURE', 'LAB']),
    departmentId: id,
  })
  .refine((c) => c.lecturesPerWeek + c.labsPerWeek > 0, {
    message: 'A course must require at least one lecture or one lab per week',
    path: ['lecturesPerWeek'],
  })
  .refine((c) => c.type !== 'LAB' || c.labsPerWeek > 0, {
    message: 'A course of type LAB must require at least one lab session per week',
    path: ['labsPerWeek'],
  });

export const instructorInput = z.object({
  name,
  email: z.string().trim().email(),
  departmentId: id,
  qualifiedCourseIds: z.array(id).min(1, 'An instructor must be qualified for at least one course'),
  availableSlotIds: z.array(id).min(1, 'An instructor must be available for at least one time slot'),
});

export const roomInput = z.object({
  number: code,
  building: z.string().trim().min(1).max(60),
  capacity: z.number().int().min(1).max(500),
  type: z.enum(['LECTURE_HALL', 'LAB']),
});

export const batchInput = z.object({
  programId: id,
  semester: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(4),
  studentCount: z.number().int().min(1).max(500),
  courseIds: z.array(id).min(1, 'A batch must be enrolled in at least one course'),
});

export const meetingTimeInput = z.object({
  day: z.enum(DAYS),
  period: z.number().int().min(1).max(PERIODS_PER_DAY),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
});

export const gaConfigInput = z.object({
  populationSize: z.number().int().min(10).max(1000).default(100),
  maxGenerations: z.number().int().min(1).max(10000).default(1000),
  crossoverRate: z.number().min(0).max(1).default(0.8),
  mutationRate: z.number().min(0).max(1).default(0.05),
  tournamentSize: z.number().int().min(2).max(50).default(5),
  elitismRate: z.number().min(0).max(0.9).default(0.2),
  seed: z.number().int().default(42),
  stagnationLimit: z.number().int().min(1).max(1000).default(50),
});

export const loginInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export type DepartmentInput = z.infer<typeof departmentInput>;
export type ProgramInput = z.infer<typeof programInput>;
export type CourseInput = z.infer<typeof courseInput>;
export type InstructorInput = z.infer<typeof instructorInput>;
export type RoomInput = z.infer<typeof roomInput>;
export type BatchInput = z.infer<typeof batchInput>;
export type MeetingTimeInput = z.infer<typeof meetingTimeInput>;
export type GAConfigInput = z.infer<typeof gaConfigInput>;
export type LoginInput = z.infer<typeof loginInput>;
