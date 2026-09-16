import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CharityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [donating, setDonating] = useState(false);
  const [amount, setAmount] = useState('10');
  const [donateError, setDonateError] = useState('');

  const { data: charity, isLoading, error } = useQuery({
    queryKey: ['charity', slug],
    queryFn: () => api.get(`/charities/${slug}`).then(r => r.data),
  });

  async function handleDonate() {
    setDonateError('');
    const pence = Math.round(parseFloat(amount) * 100);
    if (isNaN(pence) || pence < 100) {
      setDonateError('Minimum donation is £1.00');
      return;
    }
    try {
      setDonating(true);
      const { data } = await api.post('/donations/checkout', { charityId: charity.id, amountPence: pence });
      window.location.href = data.url;
    } catch (e: any) {
      setDonateError(e.response?.data?.error ?? 'Something went wrong');
      setDonating(false);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error || !charity) return <div className="min-h-screen flex items-center justify-center"><ErrorMessage message="Charity not found" /></div>;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {charity.image_url && (
          <img src={charity.image_url} alt={charity.name} className="w-full h-64 object-cover rounded-2xl mb-8" />
        )}

        <h1 className="text-4xl font-bold mb-4">{charity.name}</h1>
        <p className="text-white/60 leading-relaxed mb-10">{charity.description}</p>

        {/* Events */}
        {charity.charity_events?.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Upcoming events</h2>
            <div className="space-y-3">
              {charity.charity_events
                .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                .map((ev: any) => (
                  <div key={ev.id} className="card flex gap-4 items-start">
                    <div className="text-center min-w-[48px]">
                      <div className="text-brand-500 font-bold text-lg leading-none">
                        {new Date(ev.event_date).getDate()}
                      </div>
                      <div className="text-white/40 text-xs uppercase">
                        {new Date(ev.event_date).toLocaleString('default', { month: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      {ev.description && <div className="text-white/50 text-sm mt-0.5">{ev.description}</div>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* One-off donation */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Make a one-off donation</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Amount (£)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input"
              />
            </div>
            <button onClick={handleDonate} disabled={donating} className="btn-primary">
              {donating ? 'Redirecting...' : 'Donate'}
            </button>
          </div>
          <ErrorMessage message={donateError} />
        </div>
      </div>
    </div>
  );
}
