# Digital Heroes

Golf performance tracking + monthly prize draw + charity fundraising platform.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (JWT) |
| Payments | Stripe (Checkout + Webhooks) |

## Setup

### 1. Database
Run `backend/schema.sql` in your Supabase SQL editor.

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # runs on :3001
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # fill in your values
npm install
npm run dev            # runs on :5173
```

### 4. Stripe
- Create two prices in Stripe dashboard: monthly (£9.99) and yearly (£95.88)
- Set `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID` in backend `.env`
- Run `stripe listen --forward-to localhost:3001/webhooks/stripe` for local webhook testing

### 5. Supabase Storage
- In your Supabase dashboard go to **Storage → New bucket**
- Name: `winner-proofs`, set to **Public**
- The backend service role key handles all uploads server-side

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `SUPABASE_ANON_KEY` | Anon key (used to verify JWTs) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` or Stripe dashboard |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe Price ID for monthly plan |
| `STRIPE_YEARLY_PRICE_ID` | Stripe Price ID for yearly plan |
| `FRONTEND_URL` | e.g. `http://localhost:5173` |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL e.g. `http://localhost:3001` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key |

## User Roles
- `visitor` — public pages only
- `subscriber` — requires active subscription for dashboard/scores
- `admin` — full admin dashboard access

## Creating an admin user
After registering, run this in Supabase SQL editor:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```
