import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SubscribePage() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [charityId, setCharityId] = useState('');
  const [charityPct, setCharityPct] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: charities } = useQuery({
    queryKey: ['charities'],
    queryFn: () => api.get('/charities').then(r => r.data),
  });

  async function handleCheckout() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/checkout', { plan, charityId: charityId || undefined, charityPct });
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">Choose your plan</h1>
          <p className="text-white/50">Cancel anytime. Your charity gets paid regardless.</p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {(['monthly', 'yearly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`card text-left transition-all ${plan === p ? 'border-brand-500 bg-brand-500/10' : 'hover:border-white/20'}`}
            >
              <div className="font-semibold capitalize mb-1">{p}</div>
              <div className="text-2xl font-bold text-brand-500">
                {p === 'monthly' ? '£9.99' : '£95.88'}
              </div>
              <div className="text-white/40 text-sm">{p === 'monthly' ? 'per month' : 'per year (save 20%)'}</div>
            </button>
          ))}
        </div>

        {/* Charity selection */}
        <div className="card space-y-4 mb-6">
          <div>
            <label className="label">Choose a charity (optional)</label>
            {charities ? (
              <select value={charityId} onChange={e => setCharityId(e.target.value)} className="input">
                <option value="">Select a charity...</option>
                {charities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-sm"><LoadingSpinner size="sm" /> Loading charities...</div>
            )}
          </div>

          <div>
            <label className="label">Charity contribution: {charityPct}%</label>
            <input
              type="range"
              min={10}
              max={100}
              value={charityPct}
              onChange={e => setCharityPct(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>10% (minimum)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <ErrorMessage message={error} />

        <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full justify-center text-lg py-4 mt-4">
          {loading ? 'Redirecting to checkout...' : `Subscribe ${plan === 'monthly' ? '£9.99/mo' : '£95.88/yr'} →`}
        </button>

        <p className="text-center text-white/30 text-xs mt-4">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
