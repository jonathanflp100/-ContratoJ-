import type { Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

/**
 * Auth modes:
 *  - supabase: browser sends "Authorization: Bearer <access_token>" from
 *    supabase.auth; the server validates it with the admin client.
 *  - dev: only when Supabase is NOT configured and NODE_ENV !== production.
 *    Browser sends "x-dev-user: email". Convenient for the AI Studio preview,
 *    never accepted in production.
 */
export function createAuthMiddleware(opts: {
  admin: SupabaseClient | null;
  allowDevAuth: boolean;
}) {
  const cache = new Map<string, { user: AuthUser; expires: number }>();

  async function resolveUser(req: Request): Promise<AuthUser | null> {
    const header = req.header('authorization') || '';
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

    if (opts.admin && token) {
      const hit = cache.get(token);
      if (hit && hit.expires > Date.now()) return hit.user;
      const { data, error } = await opts.admin.auth.getUser(token);
      if (error || !data.user) return null;
      const user = { id: data.user.id, email: (data.user.email || '').toLowerCase() };
      cache.set(token, { user, expires: Date.now() + 60_000 });
      if (cache.size > 5000) cache.clear();
      return user;
    }

    if (opts.allowDevAuth) {
      const email = (req.header('x-dev-user') || '').trim().toLowerCase();
      if (email && /^[^@\s]+@[^@\s]+$/.test(email)) {
        return { id: `dev_${email}`, email };
      }
    }
    return null;
  }

  async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
    try {
      const user = await resolveUser(req);
      if (user) req.authUser = user;
    } catch (err) {
      console.error('[auth] optional error', err);
    }
    next();
  }

  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await resolveUser(req);
      if (!user) {
        res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
        return;
      }
      req.authUser = user;
      next();
    } catch (err) {
      console.error('[auth] error', err);
      res.status(401).json({ error: 'Não foi possível validar a sessão.' });
    }
  }

  return { requireAuth, optionalAuth };
}

/** Very small in-memory fixed-window rate limiter (per key). */
export function createRateLimiter(opts: { windowMs: number; max: number; keyPrefix: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const who = req.authUser?.id || req.ip || 'anon';
    const key = `${opts.keyPrefix}:${who}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      if (hits.size > 20000) hits.clear();
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto e tente de novo.' });
      return;
    }
    next();
  };
}
