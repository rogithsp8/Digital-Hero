import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../lib/supabase';
import { stripe } from '../lib/stripe';
import { validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /auth/register — creates Supabase auth user + profile row
router.post(
  '/register',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  validate,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return res.status(400).json({ error: error.message });

    // Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // Insert profile
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      role: 'subscriber',
      stripe_customer_id: customer.id,
    });

    res.status(201).json({ message: 'Account created. Please verify your email.' });
  }
);

// POST /auth/login — returns session tokens (handled client-side via Supabase JS, but we expose a server endpoint for completeness)
router.post(
  '/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
  }
);

// GET /auth/me — returns current user profile + subscription status
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .eq('id', req.userId!)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, charity_id, charity_pct, current_period_end')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  res.json({ profile, subscription });
});

export default router;
