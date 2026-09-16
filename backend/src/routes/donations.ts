import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../lib/supabase';
import { stripe } from '../lib/stripe';
import { validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /donations/checkout — one-off donation via Stripe
router.post(
  '/checkout',
  body('charityId').isUUID(),
  body('amountPence').isInt({ min: 100 }),
  validate,
  async (req: Request, res: Response) => {
    const { charityId, amountPence } = req.body;

    const { data: charity } = await supabase
      .from('charities')
      .select('name')
      .eq('id', charityId)
      .single();

    if (!charity) return res.status(404).json({ error: 'Charity not found' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: amountPence,
          product_data: { name: `Donation to ${charity.name}` },
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/charities?donated=true`,
      cancel_url: `${process.env.FRONTEND_URL}/charities`,
      metadata: { charityId, amountPence: String(amountPence), type: 'donation' },
    });

    res.json({ url: session.url });
  }
);

export default router;
