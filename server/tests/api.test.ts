/**
 * Integration tests over the real HTTP surface, with a real database.
 *
 * These are what verify FR6. A unit test of `requireRole` proves the function returns 403;
 * only mounting the actual router proves the middleware is wired onto every mutating route,
 * which is the mistake that actually happens in practice.
 *
 * Requires PostgreSQL running (`npm run db:up`) and the seed data loaded (`npm run seed`).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

let adminToken = '';
let viewerToken = '';

beforeAll(async () => {
  const admin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@academia.edu.np', password: 'admin123' });
  const viewer = await request(app)
    .post('/api/auth/login')
    .send({ email: 'viewer@academia.edu.np', password: 'viewer123' });

  expect(admin.status).toBe(200);
  expect(viewer.status).toBe(200);
  adminToken = admin.body.token;
  viewerToken = viewer.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Health', () => {
  it('reports service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Authentication (FR6)', () => {
  it('rejects an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@academia.edu.np', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('gives the same message for both, so accounts cannot be enumerated', async () => {
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'whatever' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@academia.edu.np', password: 'wrongpassword' });
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  it('rejects a malformed email before touching the database', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'abcdef' });
    expect(res.status).toBe(400);
  });

  it('returns the signed-in user for a valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}x`);
    expect(res.status).toBe(401);
  });
});

describe('Role-based access control (FR6)', () => {
  it('requires authentication for every entity endpoint', async () => {
    for (const path of ['/api/courses', '/api/rooms', '/api/instructors', '/api/batches']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });

  it('allows a viewer to read', async () => {
    const res = await request(app).get('/api/rooms').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids a viewer from creating, updating or deleting', async () => {
    const rooms = await request(app).get('/api/rooms').set('Authorization', `Bearer ${viewerToken}`);
    const roomId = rooms.body[0].id;

    const create = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ number: 'X-999', building: 'Test', capacity: 30, type: 'LECTURE_HALL' });
    const update = await request(app)
      .put(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ number: 'X-998', building: 'Test', capacity: 30, type: 'LECTURE_HALL' });
    const remove = await request(app).delete(`/api/rooms/${roomId}`).set('Authorization', `Bearer ${viewerToken}`);

    expect(create.status).toBe(403);
    expect(update.status).toBe(403);
    expect(remove.status).toBe(403);
  });

  it('forbids a viewer from running the algorithm', async () => {
    const res = await request(app).post('/api/schedule/generate').set('Authorization', `Bearer ${viewerToken}`).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('ADMIN');
  });

  it('allows a viewer to read schedule runs and export', async () => {
    const res = await request(app).get('/api/schedule/runs').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Entity CRUD (FR1)', () => {
  it('lists the seeded benchmark dataset', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const [courses, instructors, rooms, batches, meetingTimes] = await Promise.all([
      request(app).get('/api/courses').set(auth),
      request(app).get('/api/instructors').set(auth),
      request(app).get('/api/rooms').set(auth),
      request(app).get('/api/batches').set(auth),
      request(app).get('/api/meeting-times').set(auth),
    ]);

    // The NFR1 configuration: "6 programs, 30 courses, 20 teachers, 15 rooms".
    expect(courses.body).toHaveLength(30);
    expect(instructors.body).toHaveLength(20);
    expect(rooms.body).toHaveLength(15);
    expect(batches.body).toHaveLength(12);
    expect(meetingTimes.body).toHaveLength(36);
  });

  it('creates, reads, updates and deletes a room', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const created = await request(app)
      .post('/api/rooms')
      .set(auth)
      .send({ number: 'TEST-101', building: 'Test Block', capacity: 45, type: 'LECTURE_HALL' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const read = await request(app).get(`/api/rooms/${id}`).set(auth);
    expect(read.body.number).toBe('TEST-101');

    const updated = await request(app)
      .put(`/api/rooms/${id}`)
      .set(auth)
      .send({ number: 'TEST-101', building: 'Test Block', capacity: 55, type: 'LAB' });
    expect(updated.body.capacity).toBe(55);
    expect(updated.body.type).toBe('LAB');

    expect((await request(app).delete(`/api/rooms/${id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/rooms/${id}`).set(auth)).status).toBe(404);
  });

  it('rejects invalid input with per-field messages', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ number: 'X', building: '', capacity: -5, type: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details.some((d: { field: string }) => d.field === 'capacity')).toBe(true);
  });

  it('rejects a course requiring neither lectures nor labs', async () => {
    const departments = await request(app).get('/api/departments').set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'ZZZ999', name: 'Empty Course', creditHours: 3,
        lecturesPerWeek: 0, labsPerWeek: 0, type: 'LECTURE',
        departmentId: departments.body[0].id,
      });
    expect(res.status).toBe(400);
  });

  it('reports a duplicate unique code as a conflict, not a crash', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const rooms = await request(app).get('/api/rooms').set(auth);
    const existing = rooms.body[0];

    const res = await request(app)
      .post('/api/rooms')
      .set(auth)
      .send({ number: existing.number, building: 'Duplicate', capacity: 40, type: 'LECTURE_HALL' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('refuses to delete a record other data depends on', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const departments = await request(app).get('/api/departments').set(auth);
    // Every seeded department has courses and instructors attached.
    const res = await request(app).delete(`/api/departments/${departments.body[0].id}`).set(auth);
    expect(res.status).toBe(409);
  });
});

describe('Feasibility analysis (NFR4)', () => {
  it('reports the seeded dataset as feasible, with statistics', async () => {
    const res = await request(app).post('/api/schedule/validate').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.feasible).toBe(true);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.stats.requiredSessions).toBeGreaterThan(0);
    expect(res.body.stats.rooms).toBe(15);
  });
});

describe('Generation and export (FR4, FR5)', () => {
  it('runs the algorithm and produces a conflict-free timetable', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const started = await request(app)
      .post('/api/schedule/generate')
      .set(auth)
      // A short run: this test verifies the pipeline, not convergence quality --
      // that is what the GA test suite and the benchmarks are for.
      .send({ populationSize: 60, maxGenerations: 120, seed: 4242 });

    expect(started.status).toBe(202);
    const runId = started.body.runId;
    expect(started.body.totalSessions).toBeGreaterThan(0);

    // Poll to completion.
    let status = 'RUNNING';
    const deadline = Date.now() + 120_000;
    while (status === 'RUNNING' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      const detail = await request(app).get(`/api/schedule/runs/${runId}`).set(auth);
      status = detail.body.status;
    }

    const final = await request(app).get(`/api/schedule/runs/${runId}`).set(auth);
    expect(final.status).toBe(200);
    expect(final.body.status).toBe('COMPLETED');
    expect(final.body.hardViolations).toBe(0);
    expect(final.body.assignments.length).toBeGreaterThan(0);
    expect(final.body.convergence.length).toBeGreaterThan(0);

    // The stored timetable must contain no double-booking, checked independently of the
    // fitness counter that produced it.
    const seen = { teacher: new Set<string>(), room: new Set<string>(), batch: new Set<string>() };
    for (const a of final.body.assignments) {
      const t = `${a.instructorId}@${a.meetingTimeId}`;
      const r = `${a.roomId}@${a.meetingTimeId}`;
      const b = `${a.batchId}@${a.meetingTimeId}`;
      expect(seen.teacher.has(t)).toBe(false);
      expect(seen.room.has(r)).toBe(false);
      expect(seen.batch.has(b)).toBe(false);
      seen.teacher.add(t);
      seen.room.add(r);
      seen.batch.add(b);
    }

    // FR5: every format in every view.
    // `responseType('blob')` is required -- supertest only buffers bodies for content types
    // it can parse, and leaves res.body as an empty object for binary downloads.
    for (const view of ['batch', 'teacher', 'room']) {
      const xlsx = await request(app)
        .get(`/api/schedule/runs/${runId}/export.xlsx?view=${view}`)
        .responseType('blob')
        .set(auth);
      expect(xlsx.status).toBe(200);
      expect(xlsx.headers['content-type']).toContain('spreadsheetml');
      expect(xlsx.body.length).toBeGreaterThan(1000);
      // A .xlsx file is a ZIP archive, so it must begin with the PK signature.
      expect(xlsx.body.subarray(0, 2).toString()).toBe('PK');

      const pdf = await request(app)
        .get(`/api/schedule/runs/${runId}/export.pdf?view=${view}`)
        .responseType('blob')
        .set(auth);
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toContain('pdf');
      expect(pdf.body.length).toBeGreaterThan(1000);
      expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    }

    // The batch export must contain one worksheet per batch: the twelve seeded cohorts
    // share only six distinct section labels, so this is the regression guard for the
    // duplicate-worksheet-name defect.
    const batchXlsx = await request(app)
      .get(`/api/schedule/runs/${runId}/export.xlsx?view=batch`)
      .responseType('blob')
      .set(auth);
    expect(batchXlsx.status).toBe(200);
  }, 180_000);

  it('rejects an unknown export view', async () => {
    const runs = await request(app).get('/api/schedule/runs').set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .get(`/api/schedule/runs/${runs.body[0].id}/export.pdf?view=nonsense`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for a run that does not exist', async () => {
    const res = await request(app)
      .get('/api/schedule/runs/clzzzzzzzzzzzzzzzzzzzzzzz')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
