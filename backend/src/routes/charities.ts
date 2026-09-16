import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { supabase } from '../lib/supabase';
import { validate } from '../middleware/validation';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /charities — public, with search + filter
router.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  let q = supabase.from('charities').select('id, name, slug, description, image_url, is_featured');

  if (search) q = q.ilike('name', `%${search}%`);

  const { data, error } = await q.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /charities/featured
router.get('/featured', async (_req: Request, res: Response) => {
  const { data } = await supabase
    .from('charities')
    .select('id, name, slug, description, image_url')
    .eq('is_featured', true)
    .limit(3);
  res.json(data ?? []);
});

// GET /charities/:slug — public detail with events
router.get('/:slug', async (req: Request, res: Response) => {
  const { data: charity, error } = await supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('slug', req.params.slug)
    .single();

  if (error || !charity) return res.status(404).json({ error: 'Charity not found' });
  res.json(charity);
});

// --- Admin routes ---
router.use(authenticate, requireRole('admin'));

// POST /charities
router.post(
  '/',
  body('name').notEmpty(),
  body('slug').notEmpty().matches(/^[a-z0-9-]+$/),
  body('description').optional().isString(),
  body('image_url').optional().isURL(),
  validate,
  async (req: Request, res: Response) => {
    const { name, slug, description, image_url, is_featured } = req.body;
    const { data, error } = await supabase
      .from('charities')
      .insert({ name, slug, description, image_url, is_featured: is_featured ?? false })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  }
);

// PUT /charities/:id
router.put('/:id', param('id').isUUID(), validate, async (req: Request, res: Response) => {
  const { name, slug, description, image_url, is_featured } = req.body;
  const { data, error } = await supabase
    .from('charities')
    .update({ name, slug, description, image_url, is_featured })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error || !data) return res.status(404).json({ error: 'Charity not found' });
  res.json(data);
});

// DELETE /charities/:id
router.delete('/:id', param('id').isUUID(), validate, async (req: Request, res: Response) => {
  const { error } = await supabase.from('charities').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ error: 'Charity not found' });
  res.status(204).send();
});

// POST /charities/:id/events
router.post('/:id/events', param('id').isUUID(), body('title').notEmpty(), body('event_date').isDate(), validate, async (req: Request, res: Response) => {
  const { title, event_date, description } = req.body;
  const { data, error } = await supabase
    .from('charity_events')
    .insert({ charity_id: req.params.id, title, event_date, description })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /charities/:id/events/:eventId
router.delete('/:id/events/:eventId', async (req: Request, res: Response) => {
  await supabase.from('charity_events').delete().eq('id', req.params.eventId);
  res.status(204).send();
});

export default router;
