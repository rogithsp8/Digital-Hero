import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { supabase } from '../lib/supabase';
import { validate } from '../middleware/validation';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Subscriber routes ─────────────────────────────────────────────────────────

// GET /winners/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('winners')
    .select('id, tier, prize_pence, verification_status, proof_url, paid_at, draws(month)')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false });
  res.json(data ?? []);
});

// POST /winners/:id/proof — multipart file upload to Supabase Storage
router.post(
  '/:id/proof',
  authenticate,
  param('id').isUUID(),
  validate,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { data: winner } = await supabase
      .from('winners')
      .select('id, user_id, verification_status')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!winner) return res.status(404).json({ error: 'Winner record not found' });
    if (winner.verification_status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const ext = req.file.originalname.split('.').pop() ?? 'jpg';
    const storagePath = `proofs/${req.params.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('winner-proofs')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage.from('winner-proofs').getPublicUrl(storagePath);

    await supabase.from('winners').update({ proof_url: publicUrl }).eq('id', req.params.id);

    res.json({ proof_url: publicUrl });
  }
);

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /winners — all winners
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('winners')
    .select('*, users(email), draws(month)')
    .order('created_at', { ascending: false });
  res.json(data ?? []);
});

// POST /winners/:id/verify
router.post(
  '/:id/verify',
  authenticate,
  requireRole('admin'),
  param('id').isUUID(),
  body('status').isIn(['approved', 'rejected']),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabase
      .from('winners')
      .update({ verification_status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Winner not found' });
    res.json(data);
  }
);

// POST /winners/:id/payout
router.post(
  '/:id/payout',
  authenticate,
  requireRole('admin'),
  param('id').isUUID(),
  validate,
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabase
      .from('winners')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('verification_status', 'approved')
      .select()
      .single();
    if (error || !data) return res.status(400).json({ error: 'Winner not found or not yet approved' });
    res.json(data);
  }
);

export default router;
