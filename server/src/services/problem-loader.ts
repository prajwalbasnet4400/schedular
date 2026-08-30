/**
 * Reads the institutional data out of PostgreSQL and hands the GA an in-memory problem
 * instance.
 *
 * This is the only place the algorithm meets the database. Everything is fetched in six
 * queries up front; the evolutionary loop that follows performs no I/O whatsoever, which
 * is what makes the NFR1 timing budget achievable.
 */
import { prisma } from '../lib/prisma';
import { ProblemContext } from '../ga/context';
import type { RawInput } from '../ga/context';

export async function loadRawInput(): Promise<RawInput> {
  const [courses, instructors, rooms, batches, meetingTimes] = await Promise.all([
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
      orderBy: [{ programId: 'asc' }, { semester: 'asc' }, { section: 'asc' }],
      include: { program: { select: { code: true } }, courses: { select: { id: true } } },
    }),
    prisma.meetingTime.findMany({ orderBy: [{ day: 'asc' }, { period: 'asc' }] }),
  ]);

  return {
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      lecturesPerWeek: c.lecturesPerWeek,
      labsPerWeek: c.labsPerWeek,
      type: c.type,
    })),
    instructors: instructors.map((i) => ({
      id: i.id,
      name: i.name,
      qualifiedCourseIds: i.courses.map((c) => c.id),
      availableSlotIds: i.availability.map((a) => a.meetingTimeId),
    })),
    rooms: rooms.map((r) => ({ id: r.id, number: r.number, capacity: r.capacity, type: r.type })),
    batches: batches.map((b) => ({
      id: b.id,
      label: `${b.program.code} Sem ${b.semester}${b.section}`,
      studentCount: b.studentCount,
      courseIds: b.courses.map((c) => c.id),
    })),
    meetingTimes: meetingTimes.map((m) => ({ id: m.id, day: m.day, period: m.period })),
  };
}

export async function loadProblemContext(): Promise<ProblemContext> {
  return new ProblemContext(await loadRawInput());
}
