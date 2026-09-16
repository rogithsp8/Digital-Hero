import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

function formatPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    canceled: 'bg-red-500/20 text-red-400',
    past_due: 'bg-yellow-500/20 text-yellow-400',
    pending: 'bg-white/10 text-white/60',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  };
  return <span className={`badge ${colors[status] ?? 'bg-white/10 text-white/60'}`}>{status.replace('_', ' ')}</span>;
}

export default function DashboardPage() {
  const { user, subscription, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState<'scores' | 'charity' | 'draws' | 'winnings'>('scores');

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-white/50">{user?.email}</p>
        </div>

        {/* Subscription status card */}
        <div className="card mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-white/50 mb-1">Subscription</div>
            <div className="flex items-center gap-3">
              <StatusBadge status={subscription?.status ?? 'none'} />
              {subscription?.plan && <span className="text-white/60 text-sm capitalize">{subscription.plan} plan</span>}
            </div>
            {subscription?.current_period_end && (
              <div className="text-white/40 text-xs mt-1">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
          {subscription?.status !== 'active' && (
            <a href="/subscribe" className="btn-primary text-sm">Subscribe now</a>
          )}
          {subscription?.status === 'active' && (
            <CancelButton onCancel={refreshMe} />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-8 overflow-x-auto">
          {(['scores', 'charity', 'draws', 'winnings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap ${
                activeTab === tab ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'scores' && <ScoresTab />}
        {activeTab === 'charity' && <CharityTab />}
        {activeTab === 'draws' && <DrawsTab />}
        {activeTab === 'winnings' && <WinningsTab />}
      </div>
    </div>
  );
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  async function cancel() {
    if (!confirm('Cancel your subscription at period end?')) return;
    setLoading(true);
    await api.post('/subscriptions/cancel');
    await onCancel();
    setLoading(false);
  }
  return (
    <button onClick={cancel} disabled={loading} className="btn-danger">
      {loading ? 'Canceling...' : 'Cancel subscription'}
    </button>
  );
}

function ScoresTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ value: '', played_on: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: scores, isLoading } = useQuery({
    queryKey: ['scores'],
    queryFn: () => api.get('/scores').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => editId
      ? api.put(`/scores/${editId}`, { value: Number(form.value), played_on: form.played_on })
      : api.post('/scores', { value: Number(form.value), played_on: form.played_on }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scores'] }); setForm({ value: '', played_on: '' }); setEditId(null); setError(''); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Failed to save score'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/scores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] }),
  });

  function startEdit(score: any) {
    setEditId(score.id);
    setForm({ value: String(score.value), played_on: score.played_on });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">{editId ? 'Edit score' : 'Add a score'}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Stableford score (1–45)</label>
            <input
              type="number" min={1} max={45}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Date played</label>
            <input
              type="date"
              value={form.played_on}
              onChange={e => setForm(f => ({ ...f, played_on: e.target.value }))}
              className="input"
            />
          </div>
        </div>
        <ErrorMessage message={error} />
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.value || !form.played_on}
            className="btn-primary"
          >
            {save.isPending ? 'Saving...' : editId ? 'Update score' : 'Add score'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ value: '', played_on: '' }); }} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Your scores <span className="text-white/40 font-normal text-sm">(last 5)</span></h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : scores?.length === 0 ? (
          <p className="text-white/40 text-sm">No scores yet. Add your first round above.</p>
        ) : (
          <div className="space-y-2">
            {scores?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <span className="font-semibold text-lg text-brand-500">{s.value}</span>
                  <span className="text-white/40 text-sm ml-3">{new Date(s.played_on).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-white/40 hover:text-white text-sm transition-colors">Edit</button>
                  <button onClick={() => del.mutate(s.id)} className="text-red-400/60 hover:text-red-400 text-sm transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CharityTab() {
  const { subscription, refreshMe } = useAuth();
  const qc = useQueryClient();
  const [charityId, setCharityId] = useState(subscription?.charity_id ?? '');
  const [charityPct, setCharityPct] = useState(subscription?.charity_pct ?? 10);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: charities } = useQuery({
    queryKey: ['charities'],
    queryFn: () => api.get('/charities').then(r => r.data),
  });

  const update = useMutation({
    mutationFn: () => api.patch('/subscriptions/charity', { charityId, charityPct }),
    onSuccess: () => { setSuccess(true); refreshMe(); setTimeout(() => setSuccess(false), 3000); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Update failed'),
  });

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Charity & contribution</h2>

      <div>
        <label className="label">Your charity</label>
        <select value={charityId} onChange={e => setCharityId(e.target.value)} className="input">
          <option value="">Select a charity...</option>
          {charities?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Contribution: {charityPct}% of your subscription</label>
        <input
          type="range" min={10} max={100}
          value={charityPct}
          onChange={e => setCharityPct(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>10% minimum</span><span>100%</span>
        </div>
      </div>

      <ErrorMessage message={error} />
      {success && <div className="text-green-400 text-sm">Saved!</div>}

      <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary">
        {update.isPending ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

function DrawsTab() {
  const { data: draws, isLoading } = useQuery({
    queryKey: ['draws'],
    queryFn: () => api.get('/draws').then(r => r.data),
  });

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Published draws</h2>
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : draws?.length === 0 ? (
        <p className="text-white/40 text-sm">No draws published yet.</p>
      ) : (
        <div className="space-y-3">
          {draws?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <div className="font-medium">{d.month}</div>
                <div className="text-white/40 text-sm">Pool: {formatPence(d.prize_pool_pence)}</div>
              </div>
              <div className="flex gap-1">
                {d.winning_numbers?.map((n: number) => (
                  <span key={n} className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 text-xs flex items-center justify-center font-bold">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WinningsTab() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  const { data: winners, isLoading } = useQuery({
    queryKey: ['my-winners'],
    queryFn: () => api.get('/winners/me').then(r => r.data),
  });

  async function handleFileUpload(winnerId: string, file: File) {
    setUploading(winnerId);
    setUploadError(e => ({ ...e, [winnerId]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/winners/${winnerId}/proof`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['my-winners'] });
    } catch (e: any) {
      setUploadError(err => ({ ...err, [winnerId]: e.response?.data?.error ?? 'Upload failed' }));
    } finally {
      setUploading(null);
    }
  }

  const totalWon = winners?.reduce((sum: number, w: any) => sum + (w.prize_pence ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm text-white/50 mb-1">Total won</div>
        <div className="text-3xl font-bold text-brand-500">{formatPence(totalWon)}</div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Winnings history</h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : winners?.length === 0 ? (
          <p className="text-white/40 text-sm">No winnings yet. Keep playing!</p>
        ) : (
          <div className="space-y-4">
            {winners?.map((w: any) => (
              <div key={w.id} className="border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold">{w.draws?.month}</span>
                    <span className="text-white/40 text-sm ml-2">Tier {w.tier} match</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-brand-500">{formatPence(w.prize_pence)}</span>
                    <StatusBadge status={w.paid_at ? 'paid' : w.verification_status} />
                  </div>
                </div>

                {w.verification_status === 'pending' && !w.proof_url && (
                  <div className="mt-3">
                    <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploading === w.id}
                        onChange={e => e.target.files?.[0] && handleFileUpload(w.id, e.target.files[0])}
                      />
                      {uploading === w.id ? 'Uploading...' : '📎 Upload proof screenshot'}
                    </label>
                    {uploadError[w.id] && <p className="text-red-400 text-xs mt-1">{uploadError[w.id]}</p>}
                  </div>
                )}
                {w.proof_url && (
                  <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-brand-500 text-sm hover:underline mt-2 block">
                    View submitted proof →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
