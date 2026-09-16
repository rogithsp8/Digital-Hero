import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { supabase } from '../lib/supabase';
import { validate } from '../middleware/validation';
import { authenticate, requireActiveSubscription, AuthRequest } from '../middleware/auth';

const router = Router();

// All score routes require auth + active subscription
router.use(authenticate, requireActiveSubscription);

const MAX_SCORES = 5;

// GET /scores — user's scores, newest first
router.get('/', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('scores')
    .select('id, value, played_on, created_at')
    .eq('user_id', req.userId!)
    .order('played_on', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /scores — add a score; enforces 5-score rolling window
router.post(
  '/',
  body('value').isInt({ min: 1, max: 45 }),
  body('played_on').isDate(),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { value, played_on } = req.body;
    const userId = req.userId!;

    // Check for duplicate date
    const { data: existing } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .eq('played_on', played_on)
      .single();

    if (existing) return res.status(409).json({ error: 'A score for this date already exists' });

    // Fetch current scores ordered oldest first
    const { data: current } = await supabase
      .from('scores')
      .select('id, played_on')
      .eq('user_id', userId)
      .order('played_on', { ascending: true });

    // Evict oldest if at limit
    if (current && current.length >= MAX_SCORES) {
      await supabase.from('scores').delete().eq('id', current[0].id);
    }

    const { data, error } = await supabase
      .from('scores')
      .insert({ user_id: userId, value, played_on })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  }
);

// PUT /scores/:id — edit a score
router.put(
  '/:id',
  param('id').isUUID(),
  body('value').isInt({ min: 1, max: 45 }),
  body('played_on').isDate(),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { value, played_on } = req.body;
    const userId = req.userId!;

    // Check duplicate date (excluding this record)
    const { data: dup } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .eq('played_on', played_on)
      .neq('id', req.params.id)
      .single();

    if (dup) return res.status(409).json({ error: 'Another score for this date already exists' });

    const { data, error } = await supabase
      .from('scores')
      .update({ value, played_on })
      .eq('id', req.params.id)
      .eq('user_id', userId) // ownership check
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Score not found' });
    res.json(data);
  }
);

// DELETE /scores/:id
router.delete('/:id', param('id').isUUID(), validate, async (req: AuthRequest, res: Response) => {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) return res.status(404).json({ error: 'Score not found' });
  res.status(204).send();
});

export default router;
