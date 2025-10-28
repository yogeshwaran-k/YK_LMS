import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase';

export async function logAudit(req: Request, action: string, meta?: any) {
  try {
    await supabaseAdmin.from('audit_logs').insert([
      {
        user_id: req.user?.sub ?? null,
        action,
        path: req.path,
        method: req.method,
        meta: meta ? JSON.stringify(meta) : null,
      },
    ]);
  } catch {}
}

export function audit(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    await logAudit(req, action);
    next();
  };
}