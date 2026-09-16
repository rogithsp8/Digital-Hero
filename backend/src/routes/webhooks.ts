import { Router, Request, Response } from 'express';
import { stripe } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import Stripe from 'stripe';

const router = Router();

// POST /webhooks/stripe — raw body required (configured in index.ts)
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const subscription = event.data.object as Stripe.Subscription;

  switch (event.type) {
    case 'checkout.session.completed': {
      const meta = session.metadata!;

      if (meta?.type === 'donation') {
        // One-off donation
        await supabase.from('donations').insert({
          user_id: meta.userId || null,
          charity_id: meta.charityId,
          amount_pence: parseInt(meta.amountPence),
          stripe_payment_id: session.payment_intent as string,
        });
      } else if (session.subscription) {
        // Subscription checkout
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        await supabase.from('subscriptions').upsert({
          user_id: meta.userId,
          stripe_subscription_id: stripeSub.id,
          plan: meta.plan,
          status: 'active',
          charity_id: meta.charityId || null,
          charity_pct: parseInt(meta.charityPct) || 10,
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const status = mapStripeStatus(subscription.status);
      await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', inv.subscription as string);
      break;
    }
  }

  res.json({ received: true });
});

function mapStripeStatus(s: string): string {
  if (s === 'active') return 'active';
  if (s === 'past_due') return 'past_due';
  if (s === 'canceled') return 'canceled';
  return 'incomplete';
}

export default router;
