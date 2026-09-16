import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { supabase } from '../lib/supabase';
import { validate } from '../middleware/validation';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireRole('admin'));

// GET /admin/users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('users')
    .select('id, email, role, created_at, subscriptions(plan, status, current_period_end)')
    .order('created_at', { ascending: false });
  res.json(data ?? []);
});

// PATCH /admin/users/:id/role
router.patch(
  '/users/:id/role',
  param('id').isUUID(),
  body('role').isIn(['visitor', 'subscriber', 'admin']),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabase
      .from('users')
      .update({ role: req.body.role })
      .eq('id', req.params.id)
      .select('id, email, role')
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  }
);

// GET /admin/users/:id/scores
router.get('/users/:id/scores', param('id').isUUID(), validate, async (req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', req.params.id)
    .order('played_on', { ascending: false });
  res.json(data ?? []);
});

// PUT /admin/users/:id/scores/:scoreId — admin edits a user's score
router.put(
  '/users/:id/scores/:scoreId',
  param('id').isUUID(),
  param('scoreId').isUUID(),
  body('value').isInt({ min: 1, max: 45 }),
  body('played_on').isDate(),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { value, played_on } = req.body;

    // Check for duplicate date on this user (excluding this score)
    const { data: dup } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', req.params.id)
      .eq('played_on', played_on)
      .neq('id', req.params.scoreId)
      .single();

    if (dup) return res.status(409).json({ error: 'Another score for this date already exists' });

    const { data, error } = await supabase
      .from('scores')
      .update({ value, played_on })
      .eq('id', req.params.scoreId)
      .eq('user_id', req.params.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Score not found' });
    res.json(data);
  }
);

// DELETE /admin/users/:id/scores/:scoreId
router.delete(
  '/users/:id/scores/:scoreId',
  param('id').isUUID(),
  param('scoreId').isUUID(),
  validate,
  async (req: AuthRequest, res: Response) => {
    await supabase.from('scores').delete().eq('id', req.params.scoreId).eq('user_id', req.params.id);
    res.status(204).send();
  }
);

// GET /admin/reports
router.get('/reports', async (_req: AuthRequest, res: Response) => {
  const [usersRes, subsRes, winnersRes, donationsRes, drawsRes] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('plan, status'),
    supabase.from('winners').select('prize_pence, verification_status, paid_at'),
    supabase.from('donations').select('amount_pence'),
    supabase.from('draws').select('id, month, prize_pool_pence, rollover_pence, status'),
  ]);

  const activeSubscribers = subsRes.data?.filter(s => s.status === 'active').length ?? 0;
  const totalPrizePool = winnersRes.data?.reduce((sum, w) => sum + (w.prize_pence ?? 0), 0) ?? 0;
  const totalDonations = donationsRes.data?.reduce((sum, d) => sum + (d.amount_pence ?? 0), 0) ?? 0;
  const paidOut = winnersRes.data?.filter(w => w.paid_at).reduce((sum, w) => sum + (w.prize_pence ?? 0), 0) ?? 0;

  res.json({
    totalUsers: usersRes.count ?? 0,
    activeSubscribers,
    totalPrizePoolPence: totalPrizePool,
    paidOutPence: paidOut,
    totalDonationsPence: totalDonations,
    draws: drawsRes.data ?? [],
  });
});

export default router;
