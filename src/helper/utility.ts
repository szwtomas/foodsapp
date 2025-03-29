import type { Request, Response, NextFunction } from 'express';

// Utility function to handle async route handlers
export const use = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
