/**
 * CRUD endpoints for the institutional entities of FR1.
 *
 *   "The system shall provide an administrator interface for creating, reading, updating
 *    and deleting institutional entities: departments, teachers (with subject expertise
 *    and availability), courses (with credit hours and weekly lecture requirements), rooms
 *    (with seating capacity and type designation as lecture hall or laboratory), batches
 *    (with student count) and meeting time slots."
 *
 * Six entities with near-identical handlers would be six near-identical files, so the
 * shared shape is expressed once as a factory and each entity supplies only what is
 * genuinely different: its schema, its Prisma delegate, and how it maps relations.
 * Reads are open to any signed-in user; every mutation is gated on the ADMIN role.
 */
import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import {
  batchInput,
  courseInput,
  departmentInput,
  instructorInput,
  meetingTimeInput,
  programInput,
  roomInput,
} from '@schedular/shared';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/error';

type Delegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

interface EntityConfig {
  path: string;
  schema: z.ZodTypeAny;
  delegate: Delegate;
  include?: unknown;
  orderBy?: unknown;
  /** Splits validated input into scalar columns and Prisma relation writes. */
  toPrisma?: (body: Record<string, unknown>) => Record<string, unknown>;
}

function buildEntityRouter(config: EntityConfig): Router {
  const router = Router();
  const { delegate, schema, include, orderBy } = config;
  const toPrisma = config.toPrisma ?? ((body) => body);

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      res.json(await delegate.findMany({ include, orderBy }));
    }),
  );

  router.get(
    '/:id',
    asyncRoute(async (req: Request, res) => {
      const record = await delegate.findUnique({ where: { id: req.params.id }, include });
      if (!record) {
        res.status(404).json({ error: 'That record does not exist.' });
        return;
      }
      res.json(record);
    }),
  );

  router.post(
    '/',
    requireRole('ADMIN'),
    validateBody(schema),
    asyncRoute(async (req, res) => {
      res.status(201).json(await delegate.create({ data: toPrisma(req.body), include }));
    }),
  );

  router.put(
    '/:id',
    requireRole('ADMIN'),
    validateBody(schema),
    asyncRoute(async (req: Request, res) => {
      res.json(await delegate.update({ where: { id: req.params.id }, data: toPrisma(req.body), include }));
    }),
  );

  router.delete(
    '/:id',
    requireRole('ADMIN'),
    asyncRoute(async (req: Request, res) => {
      await delegate.delete({ where: { id: req.params.id } });
      res.status(204).end();
    }),
  );

  return router;
}

/** Rewrites an array of ids into the Prisma `set` form used for many-to-many updates. */
const connectIds = (ids: unknown) => ({ set: (ids as string[]).map((id) => ({ id })) });

const ENTITIES: EntityConfig[] = [
  {
    path: 'departments',
    schema: departmentInput,
    delegate: prisma.department as unknown as Delegate,
    orderBy: { code: 'asc' },
  },
  {
    path: 'programs',
    schema: programInput,
    delegate: prisma.program as unknown as Delegate,
    include: { department: true },
    orderBy: { code: 'asc' },
  },
  {
    path: 'courses',
    schema: courseInput,
    delegate: prisma.course as unknown as Delegate,
    include: { department: true, instructors: { select: { id: true, name: true } } },
    orderBy: { code: 'asc' },
  },
  {
    path: 'rooms',
    schema: roomInput,
    delegate: prisma.room as unknown as Delegate,
    orderBy: { number: 'asc' },
  },
  {
    path: 'meeting-times',
    schema: meetingTimeInput,
    delegate: prisma.meetingTime as unknown as Delegate,
    orderBy: [{ day: 'asc' }, { period: 'asc' }],
  },
  {
    path: 'instructors',
    schema: instructorInput,
    delegate: prisma.instructor as unknown as Delegate,
    include: {
      department: true,
      courses: { select: { id: true, code: true, name: true } },
      availability: { where: { isAvailable: true }, select: { meetingTimeId: true } },
    },
    orderBy: { name: 'asc' },
    toPrisma: (body) => ({
      name: body.name,
      email: body.email,
      departmentId: body.departmentId,
      courses: connectIds(body.qualifiedCourseIds),
      // Availability is a join table with its own column, so it is replaced wholesale
      // rather than connected: the submitted list is the complete truth for this teacher.
      availability: {
        deleteMany: {},
        create: (body.availableSlotIds as string[]).map((meetingTimeId) => ({
          meetingTimeId,
          isAvailable: true,
        })),
      },
    }),
  },
  {
    path: 'batches',
    schema: batchInput,
    delegate: prisma.batch as unknown as Delegate,
    include: { program: true, courses: { select: { id: true, code: true, name: true } } },
    orderBy: [{ semester: 'asc' }, { section: 'asc' }],
    toPrisma: (body) => ({
      programId: body.programId,
      semester: body.semester,
      section: body.section,
      studentCount: body.studentCount,
      courses: connectIds(body.courseIds),
    }),
  },
];

export const entitiesRouter = Router();
entitiesRouter.use(requireAuth);
for (const entity of ENTITIES) {
  entitiesRouter.use(`/${entity.path}`, buildEntityRouter(entity));
}
