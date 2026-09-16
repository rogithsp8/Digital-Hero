import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Single anon client instance for JWT verification (created once at startup)
const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  req.userId = user.id;
  req.userRole = profile?.role ?? 'subscriber';
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.userRole ?? '')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', req.userId!)
    .eq('status', 'active')
    .single();

  if (!data) return res.status(403).json({ error: 'Active subscription required' });
  next();
}
