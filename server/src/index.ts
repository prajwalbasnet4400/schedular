import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const port = Number(process.env.PORT ?? 4000);

async function start() {
  await prisma.$connect();
  createApp().listen(port, () => {
    console.log(`Timetable API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
