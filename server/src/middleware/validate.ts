/**
 * Server-side request validation using the schemas shared with the frontend.
 *
 * Proposal section 4.3.1 promises validation on both sides. Importing the very same Zod
 * object the React forms use is what makes that promise cheap to keep: there is one
 * definition of "a valid course", not two that drift apart.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'The submitted data is not valid.',
        details: formatZodError(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((e) => ({
    field: e.path.join('.') || '(root)',
    message: e.message,
  }));
}
