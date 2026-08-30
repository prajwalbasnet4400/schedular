/** Centralised error handling, so no route leaks a stack trace to the browser. */
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'No such endpoint.' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Translate Prisma's constraint errors into messages an administrator can act on.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      res.status(409).json({ error: `A record with that ${target} already exists.` });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: 'That record is referenced by other data and cannot be changed or removed.',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'That record no longer exists.' });
      return;
    }
  }

  console.error('[unhandled]', err);
  res.status(500).json({ error: 'An unexpected error occurred on the server.' });
}

/** Wraps an async handler so a rejected promise reaches the error handler. */
export function asyncRoute<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
