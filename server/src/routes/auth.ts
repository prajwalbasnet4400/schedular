/** Authentication endpoints (FR6). */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { loginInput } from '@schedular/shared';
import { prisma } from '../lib/prisma';
import { requireAuth, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncRoute } from '../middleware/error';

export const authRouter = Router();

authRouter.post(
  '/login',
  validateBody(loginInput),
  asyncRoute(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });

    // The same message for an unknown email and a wrong password, so the endpoint cannot
    // be used to discover which accounts exist.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ token: signToken(authUser), user: authUser });
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
