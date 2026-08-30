/** Timetable generation, retrieval, streaming progress (FR4) and export (FR5). */
import { Router } from 'express';
import { DEFAULT_GA_CONFIG, gaConfigInput } from '@schedular/shared';
import type { GAConfig, ScheduleRunDetail, TimetableView } from '@schedular/shared';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncRoute, HttpError } from '../middleware/error';
import { cancelRun, startRun, subscribe } from '../services/schedule-service';
import { loadProblemContext } from '../services/problem-loader';
import { analyseFeasibility } from '../ga/feasibility';
import { buildWorkbook } from '../export/excel';
import { buildPdf } from '../export/pdf';
import { loadRunDetail } from '../services/run-detail';

export const scheduleRouter = Router();
scheduleRouter.use(requireAuth);

/** NFR4: check whether the registered data can produce a timetable at all. */
scheduleRouter.post(
  '/validate',
  asyncRoute(async (_req, res) => {
    res.json(analyseFeasibility(await loadProblemContext()));
  }),
);

/** Starts a generation run. ADMIN only, per FR6. */
scheduleRouter.post(
  '/generate',
  requireRole('ADMIN'),
  validateBody(gaConfigInput.partial()),
  asyncRoute(async (req, res) => {
    const config: GAConfig = { ...DEFAULT_GA_CONFIG, ...(req.body as Partial<GAConfig>) };
    try {
      res.status(202).json(await startRun(req.user!.id, config));
    } catch (error) {
      const e = error as Error & { status?: number; feasibility?: unknown; runId?: string };
      if (e.status === 422) {
        // Not a server fault: the administrator's data cannot produce a timetable, and the
        // report says precisely which records to fix.
        res.status(422).json({ error: e.message, feasibility: e.feasibility, runId: e.runId });
        return;
      }
      throw error;
    }
  }),
);

/**
 * Server-sent events carrying the live convergence curve (FR4).
 *
 * SSE rather than WebSockets: the traffic is strictly one-directional, it needs no
 * additional dependency or protocol upgrade, and the browser reconnects on its own. That
 * is the whole justification, and it is short enough to give verbatim at the defense.
 */
scheduleRouter.get('/runs/:id/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const unsubscribe = subscribe(req.params.id, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === 'completed' || event.type === 'failed') res.end();
  });

  // Comment frames keep intermediaries from closing an idle connection.
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

scheduleRouter.post(
  '/runs/:id/cancel',
  requireRole('ADMIN'),
  asyncRoute(async (req, res) => {
    res.json({ cancelled: cancelRun(req.params.id) });
  }),
);

/** Run history, backing the parameter-comparison table of Expected Outcome 5. */
scheduleRouter.get(
  '/runs',
  asyncRoute(async (_req, res) => {
    const runs = await prisma.scheduleRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: { select: { name: true } } },
    });
    res.json(
      runs.map((r) => ({
        id: r.id,
        status: r.status,
        config: r.config,
        bestFitness: r.bestFitness,
        generationsRun: r.generationsRun,
        durationMs: r.durationMs,
        hardViolations: r.hardViolations,
        softViolations: r.softViolations,
        createdAt: r.createdAt.toISOString(),
        createdByName: r.createdBy.name,
        message: r.message,
      })),
    );
  }),
);

/** The most recent completed run, which is what the timetable screen opens by default. */
scheduleRouter.get(
  '/runs/latest',
  asyncRoute(async (_req, res) => {
    const latest = await prisma.scheduleRun.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!latest) {
      res.status(404).json({ error: 'No timetable has been generated yet.' });
      return;
    }
    res.json(await loadRunDetail(latest.id));
  }),
);

scheduleRouter.get(
  '/runs/:id',
  asyncRoute(async (req, res) => {
    res.json(await loadRunDetail(req.params.id));
  }),
);

/** FR5: PDF and Excel export, in any of the three views. */
scheduleRouter.get(
  '/runs/:id/export.:format(xlsx|pdf)',
  asyncRoute(async (req, res) => {
    const format = req.params.format as 'xlsx' | 'pdf';
    const view = (req.query.view as TimetableView) ?? 'batch';
    if (!['batch', 'teacher', 'room'].includes(view)) {
      throw new HttpError(400, 'View must be one of batch, teacher or room.');
    }

    const detail: ScheduleRunDetail = await loadRunDetail(req.params.id);
    const filename = `timetable-${view}-${detail.id.slice(-6)}`;

    if (format === 'xlsx') {
      const workbook = await buildWorkbook(detail, view);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    const pdf = buildPdf(detail, view);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }),
);
