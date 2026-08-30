/**
 * Assembles the full payload for one generation run: the assignments plus every entity the
 * grid needs to label them.
 *
 * The reference data is sent alongside rather than joined into each row because the grid
 * renders the same course, room and teacher hundreds of times -- inlining the names would
 * multiply the payload for no benefit, and the client already needs the entity lists to
 * populate its filter dropdowns.
 */
import type { ScheduleRunDetail } from '@schedular/shared';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/error';

export async function loadRunDetail(runId: string): Promise<ScheduleRunDetail> {
  const run = await prisma.scheduleRun.findUnique({
    where: { id: runId },
    include: {
      createdBy: { select: { name: true } },
      assignments: true,
    },
  });

  if (!run) throw new HttpError(404, 'That timetable run does not exist.');

  const [courses, instructors, rooms, batches, meetingTimes, programs] = await Promise.all([
    prisma.course.findMany({ orderBy: { code: 'asc' } }),
    prisma.instructor.findMany({
      orderBy: { name: 'asc' },
      include: {
        courses: { select: { id: true } },
        availability: { where: { isAvailable: true }, select: { meetingTimeId: true } },
      },
    }),
    prisma.room.findMany({ orderBy: { number: 'asc' } }),
    prisma.batch.findMany({
      orderBy: [{ semester: 'asc' }, { section: 'asc' }],
      include: { program: { select: { code: true } }, courses: { select: { id: true } } },
    }),
    prisma.meetingTime.findMany({ orderBy: [{ day: 'asc' }, { period: 'asc' }] }),
    prisma.program.findMany({ orderBy: { code: 'asc' } }),
  ]);

  return {
    id: run.id,
    status: run.status,
    config: run.config as never,
    bestFitness: run.bestFitness,
    generationsRun: run.generationsRun,
    durationMs: run.durationMs,
    hardViolations: run.hardViolations,
    softViolations: run.softViolations,
    createdAt: run.createdAt.toISOString(),
    createdByName: run.createdBy.name,
    message: run.message ?? undefined,
    breakdown: run.breakdown as never,
    convergence: (run.convergence as never) ?? [],
    assignments: run.assignments.map((a) => ({
      courseId: a.courseId,
      instructorId: a.instructorId,
      roomId: a.roomId,
      meetingTimeId: a.meetingTimeId,
      batchId: a.batchId,
      sessionType: a.sessionType,
      sessionGroupId: a.sessionGroupId,
    })),
    reference: {
      courses: courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        creditHours: c.creditHours,
        lecturesPerWeek: c.lecturesPerWeek,
        labsPerWeek: c.labsPerWeek,
        type: c.type,
        departmentId: c.departmentId,
      })),
      instructors: instructors.map((i) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        departmentId: i.departmentId,
        qualifiedCourseIds: i.courses.map((c) => c.id),
        availableSlotIds: i.availability.map((a) => a.meetingTimeId),
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        number: r.number,
        building: r.building,
        capacity: r.capacity,
        type: r.type,
      })),
      batches: batches.map((b) => ({
        id: b.id,
        programId: b.programId,
        semester: b.semester,
        section: b.section,
        studentCount: b.studentCount,
        courseIds: b.courses.map((c) => c.id),
      })),
      meetingTimes: meetingTimes.map((m) => ({
        id: m.id,
        day: m.day,
        period: m.period,
        startTime: m.startTime,
        endTime: m.endTime,
      })),
      programs: programs.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        departmentId: p.departmentId,
        totalSemesters: p.totalSemesters,
      })),
    },
  };
}
