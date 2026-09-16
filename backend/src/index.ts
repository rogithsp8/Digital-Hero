import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import scoreRoutes from './routes/scores';
import charityRoutes from './routes/charities';
import drawRoutes from './routes/draws';
import winnerRoutes from './routes/winners';
import donationRoutes from './routes/donations';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/validation';

const app = express();

// Stripe webhooks need raw body — must be before express.json()
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/scores', scoreRoutes);
app.use('/charities', charityRoutes);
app.use('/draws', drawRoutes);
app.use('/winners', winnerRoutes);
app.use('/donations', donationRoutes);
app.use('/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Digital Heroes API running on :${PORT}`));
