import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { supabase } from '../lib/supabase';
import { validate } from '../middleware/validation';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { runDraw, calculatePrizePool } from '../services/drawEngine';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /draws — published draws only
router.get('/', async (_req: Request, res: Response) => {
  const { data } = await supabase
    .from('draws')
    .select('id, month, mode, status, prize_pool_pence, rollover_pence, winning_numbers, created_at')
    .eq('status', 'published')
    .order('month', { ascending: false });
  res.json(data ?? []);
});

// ── Admin literal routes — MUST come before /:id param routes ─────────────────

// GET /draws/all
router.get('/all', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('draws')
    .select('*')
    .order('month', { ascending: false });
  res.json(data ?? []);
});

// POST /draws
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  body('month').matches(/^\d{4}-\d{2}$/),
  body('mode').isIn(['random', 'weighted']),
  validate,
  async (req: Request, res: Response) => {
    const { month, mode } = req.body;

    const { data: lastDraw } = await supabase
      .from('draws')
      .select('rollover_pence')
      .eq('status', 'published')
      .order('month', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('draws')
      .insert({ month, mode, status: 'draft', rollover_pence: lastDraw?.rollover_pence ?? 0 })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await calculatePrizePool(data.id);
    res.status(201).json(data);
  }
);

// ── Param routes — after all literal routes ───────────────────────────────────

// GET /draws/:id/winners — public
router.get('/:id/winners', param('id').isUUID(), validate, async (req: Request, res: Response) => {
  const { data: draw } = await supabase
    .from('draws').select('status').eq('id', req.params.id).single();

  if (draw?.status !== 'published') return res.status(404).json({ error: 'Draw not found or not published' });

  const { data } = await supabase
    .from('winners')
    .select('tier, prize_pence, users(email)')
    .eq('draw_id', req.params.id);

  res.json(data ?? []);
});

// POST /draws/:id/simulate
router.post(
  '/:id/simulate',
  authenticate,
  requireRole('admin'),
  param('id').isUUID(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await runDraw(req.params.id, true);
      res.json({ simulation: true, ...result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
);

// POST /draws/:id/publish
router.post(
  '/:id/publish',
  authenticate,
  requireRole('admin'),
  param('id').isUUID(),
  validate,
  async (req: Request, res: Response) => {
    const { data: draw } = await supabase.from('draws').select('status').eq('id', req.params.id).single();
    if (draw?.status === 'published') return res.status(400).json({ error: 'Draw already published' });

    try {
      const result = await runDraw(req.params.id, false);
      res.json({ published: true, ...result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
);

export default router;
