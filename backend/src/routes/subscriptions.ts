import { Router, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../lib/supabase';
import { stripe } from '../lib/stripe';
import { validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /subscriptions/checkout — creates Stripe Checkout session
router.post('/checkout', authenticate, body('plan').isIn(['monthly', 'yearly']), validate, async (req: AuthRequest, res: Response) => {
  const { plan, charityId, charityPct = 10 } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', req.userId!)
    .single();

  const priceId = plan === 'yearly'
    ? process.env.STRIPE_YEARLY_PRICE_ID!
    : process.env.STRIPE_MONTHLY_PRICE_ID!;

  const session = await stripe.checkout.sessions.create({
    customer: user?.stripe_customer_id ?? undefined,
    customer_email: user?.stripe_customer_id ? undefined : user?.email,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.FRONTEND_URL}/subscribe?checkout=canceled`,
    metadata: { userId: req.userId!, plan, charityId: charityId ?? '', charityPct: String(charityPct) },
  });

  res.json({ url: session.url });
});

// POST /subscriptions/cancel
router.post('/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', req.userId!)
    .eq('status', 'active')
    .single();

  if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'No active subscription' });

  await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
  res.json({ message: 'Subscription will cancel at period end' });
});

// GET /subscriptions/status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, charity_id, charity_pct, current_period_end')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  res.json(data ?? { status: 'none' });
});

// PATCH /subscriptions/charity — update charity selection + percentage
router.patch('/charity', authenticate, body('charityPct').isInt({ min: 10, max: 100 }), validate, async (req: AuthRequest, res: Response) => {
  const { charityId, charityPct } = req.body;

  const { error } = await supabase
    .from('subscriptions')
    .update({ charity_id: charityId, charity_pct: charityPct })
    .eq('user_id', req.userId!)
    .eq('status', 'active');

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Updated' });
});

export default router;
