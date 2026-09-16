import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

function formatPence(p: number) { return `£${(p / 100).toFixed(2)}`; }

export default function AdminDashboard() {
  const [tab, setTab] = useState<'users' | 'draws' | 'charities' | 'winners' | 'reports'>('reports');

  const tabs = ['reports', 'users', 'draws', 'charities', 'winners'] as const;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-white/50">Platform management</p>
        </div>

        <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-8 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize whitespace-nowrap ${
                tab === t ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'reports' && <ReportsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'draws' && <DrawsTab />}
        {tab === 'charities' && <CharitiesTab />}
        {tab === 'winners' && <WinnersTab />}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => api.get('/admin/reports').then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const stats = [
    { label: 'Total users', value: data?.totalUsers ?? 0 },
    { label: 'Active subscribers', value: data?.activeSubscribers ?? 0 },
    { label: 'Total prize pool', value: formatPence(data?.totalPrizePoolPence ?? 0) },
    { label: 'Paid out', value: formatPence(data?.paidOutPence ?? 0) },
    { label: 'Total donations', value: formatPence(data?.totalDonationsPence ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-2xl font-bold text-brand-500 mb-1">{s.value}</div>
            <div className="text-white/50 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Draw history</h2>
        <div className="space-y-2">
          {data?.draws?.map((d: any) => (
            <div key={d.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
              <span>{d.month}</span>
              <span className="text-white/50 capitalize">{d.status}</span>
              <span className="text-brand-500">{formatPence(d.prize_pool_pence)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const { data: userScores } = useQuery({
    queryKey: ['admin-user-scores', expandedUser],
    queryFn: () => api.get(`/admin/users/${expandedUser}/scores`).then(r => r.data),
    enabled: !!expandedUser,
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const editScore = useMutation({
    mutationFn: ({ userId, scoreId, value, played_on }: any) =>
      api.put(`/admin/users/${userId}/scores/${scoreId}`, { value, played_on }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user-scores', expandedUser] }),
  });

  const deleteScore = useMutation({
    mutationFn: ({ userId, scoreId }: any) => api.delete(`/admin/users/${userId}/scores/${scoreId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user-scores', expandedUser] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4">Users ({data?.length ?? 0})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-left border-b border-white/5">
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Sub status</th>
              <th className="pb-3 pr-4">Plan</th>
              <th className="pb-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: any) => {
              const sub = u.subscriptions?.[0];
              return (
                <tr
                  key={u.id}
                  className={`border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/2 transition-colors ${expandedUser === u.id ? 'bg-white/5' : ''}`}
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                >
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4" onClick={e => e.stopPropagation()}>
                    <select
                      value={u.role}
                      onChange={e => changeRole.mutate({ id: u.id, role: e.target.value })}
                      className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="visitor">visitor</option>
                      <option value="subscriber">subscriber</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${sub?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                      {sub?.status ?? 'none'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 capitalize text-white/60">{sub?.plan ?? '—'}</td>
                  <td className="py-3 text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded score editor */}
      {expandedUser && (
        <div className="card">
          <h3 className="font-semibold mb-4 text-sm text-white/60">Scores for selected user</h3>
          {!userScores ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : userScores.length === 0 ? (
            <p className="text-white/40 text-sm">No scores.</p>
          ) : (
            <div className="space-y-2">
              {userScores.map((s: any) => (
                <AdminScoreRow
                  key={s.id}
                  score={s}
                  userId={expandedUser}
                  onSave={(scoreId, value, played_on) => editScore.mutate({ userId: expandedUser, scoreId, value, played_on })}
                  onDelete={(scoreId) => deleteScore.mutate({ userId: expandedUser, scoreId })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminScoreRow({ score, userId, onSave, onDelete }: { score: any; userId: string; onSave: (id: string, v: number, d: string) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(score.value));
  const [date, setDate] = useState(score.played_on);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      {editing ? (
        <>
          <input type="number" min={1} max={45} value={value} onChange={e => setValue(e.target.value)} className="input text-sm w-20" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-sm" />
          <button onClick={() => { onSave(score.id, Number(value), date); setEditing(false); }} className="btn-primary text-xs py-1.5 px-3">Save</button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
        </>
      ) : (
        <>
          <span className="font-semibold text-brand-500 w-8">{score.value}</span>
          <span className="text-white/50 text-sm flex-1">{new Date(score.played_on).toLocaleDateString()}</span>
          <button onClick={() => setEditing(true)} className="text-white/40 hover:text-white text-xs transition-colors">Edit</button>
          <button onClick={() => onDelete(score.id)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">Delete</button>
        </>
      )}
    </div>
  );
}

function DrawsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ month: '', mode: 'random' as 'random' | 'weighted' });
  const [error, setError] = useState('');
  const [simResult, setSimResult] = useState<any>(null);

  const { data: draws, isLoading } = useQuery({
    queryKey: ['admin-draws'],
    queryFn: () => api.get('/draws/all').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/draws', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-draws'] }); setForm({ month: '', mode: 'random' }); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Failed to create draw'),
  });

  const simulate = useMutation({
    mutationFn: (id: string) => api.post(`/draws/${id}/simulate`).then(r => r.data),
    onSuccess: (data) => { setSimResult(data); qc.invalidateQueries({ queryKey: ['admin-draws'] }); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Simulation failed'),
  });

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/draws/${id}/publish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-draws'] }); setSimResult(null); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Publish failed'),
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">Create draw</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Month (YYYY-MM)</label>
            <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Mode</label>
            <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as any }))} className="input">
              <option value="random">Random / Lottery</option>
              <option value="weighted">Weighted by score frequency</option>
            </select>
          </div>
        </div>
        <ErrorMessage message={error} />
        <button onClick={() => create.mutate()} disabled={create.isPending || !form.month} className="btn-primary">
          {create.isPending ? 'Creating...' : 'Create draw'}
        </button>
      </div>

      {simResult && (
        <div className="card border-brand-500/30">
          <h3 className="font-semibold mb-3 text-brand-500">Simulation result</h3>
          <div className="flex gap-1 mb-3">
            {simResult.winningNumbers?.map((n: number) => (
              <span key={n} className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-500 text-sm flex items-center justify-center font-bold">{n}</span>
            ))}
          </div>
          {[5, 4, 3].map(tier => (
            <div key={tier} className="text-sm text-white/50">
              Tier {tier}: {simResult.tierWinners?.[tier]?.length ?? 0} winner(s)
            </div>
          ))}
          {simResult.rolloverPence > 0 && (
            <div className="text-sm text-accent-400 mt-2">⚡ Jackpot rolls over: {formatPence(simResult.rolloverPence)}</div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (
        <div className="card">
          <h2 className="font-semibold mb-4">All draws</h2>
          <div className="space-y-3">
            {draws?.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <span className="font-medium">{d.month}</span>
                  <span className="text-white/40 text-sm ml-2 capitalize">{d.mode}</span>
                  <span className={`badge ml-2 ${d.status === 'published' ? 'bg-green-500/20 text-green-400' : d.status === 'simulated' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'}`}>
                    {d.status}
                  </span>
                  {d.rollover_pence > 0 && (
                    <span className="badge ml-2 bg-accent-400/20 text-accent-400">⚡ +{formatPence(d.rollover_pence)} rollover</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.status !== 'published' && (
                    <>
                      <button onClick={() => simulate.mutate(d.id)} disabled={simulate.isPending} className="btn-secondary text-xs py-1.5 px-3">
                        Simulate
                      </button>
                      <button onClick={() => { if (confirm('Publish this draw? This cannot be undone.')) publish.mutate(d.id); }} disabled={publish.isPending} className="btn-primary text-xs py-1.5 px-3">
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CharitiesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', slug: '', description: '', image_url: '', is_featured: false });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: charities, isLoading } = useQuery({
    queryKey: ['charities'],
    queryFn: () => api.get('/charities').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => editId ? api.put(`/charities/${editId}`, form) : api.post('/charities', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charities'] }); setForm({ name: '', slug: '', description: '', image_url: '', is_featured: false }); setEditId(null); setError(''); },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Save failed'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/charities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charities'] }),
  });

  function startEdit(c: any) {
    setEditId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', image_url: c.image_url ?? '', is_featured: c.is_featured });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">{editId ? 'Edit charity' : 'Add charity'}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Slug (URL-safe)</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="e.g. my-charity" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[80px]" />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="input" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input type="checkbox" id="featured" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="accent-brand-500 w-4 h-4" />
            <label htmlFor="featured" className="text-sm text-white/70">Featured on homepage</label>
          </div>
        </div>
        <ErrorMessage message={error} />
        <div className="flex gap-3">
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.slug} className="btn-primary">
            {save.isPending ? 'Saving...' : editId ? 'Update' : 'Add charity'}
          </button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: '', slug: '', description: '', image_url: '', is_featured: false }); }} className="btn-secondary">Cancel</button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (
        <div className="card">
          <h2 className="font-semibold mb-4">All charities</h2>
          <div className="space-y-2">
            {charities?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.is_featured && <span className="badge bg-accent-400/20 text-accent-400 ml-2">Featured</span>}
                  <div className="text-white/40 text-xs">{c.slug}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="btn-secondary text-xs py-1.5 px-3">Edit</button>
                  <button onClick={() => { if (confirm('Delete this charity?')) del.mutate(c.id); }} className="btn-danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WinnersTab() {
  const qc = useQueryClient();

  const { data: winners, isLoading } = useQuery({
    queryKey: ['admin-winners'],
    queryFn: () => api.get('/winners').then(r => r.data),
  });

  const verify = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.post(`/winners/${id}/verify`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-winners'] }),
  });

  const payout = useMutation({
    mutationFn: (id: string) => api.post(`/winners/${id}/payout`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-winners'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Winners ({winners?.length ?? 0})</h2>
      <div className="space-y-4">
        {winners?.length === 0 && <p className="text-white/40 text-sm">No winners yet.</p>}
        {winners?.map((w: any) => (
          <div key={w.id} className="border border-white/5 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-medium">{w.users?.email}</div>
                <div className="text-white/40 text-sm">{w.draws?.month} · Tier {w.tier} · {formatPence(w.prize_pence)}</div>
                {w.proof_url && (
                  <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-brand-500 text-xs hover:underline mt-1 block">
                    View proof →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${w.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' : w.verification_status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/50'}`}>
                  {w.verification_status}
                </span>
                {w.paid_at && <span className="badge bg-green-500/20 text-green-400">Paid</span>}

                {w.verification_status === 'pending' && (
                  <>
                    <button onClick={() => verify.mutate({ id: w.id, status: 'approved' })} className="btn-primary text-xs py-1.5 px-3">Approve</button>
                    <button onClick={() => verify.mutate({ id: w.id, status: 'rejected' })} className="btn-danger">Reject</button>
                  </>
                )}
                {w.verification_status === 'approved' && !w.paid_at && (
                  <button onClick={() => payout.mutate(w.id)} className="btn-primary text-xs py-1.5 px-3">Mark paid</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
