/**
 * Express application wiring.
 *
 * Exported separately from the listener so the integration tests can mount it with
 * supertest without binding a port.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth';
import { entitiesRouter } from './routes/entities';
import { scheduleRouter } from './routes/schedule';
import { errorHandler, notFound } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? ['http://localhost:5173'],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Automated College Timetable Generator' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', entitiesRouter);
  app.use('/api/schedule', scheduleRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
