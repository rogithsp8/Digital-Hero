import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ErrorMessage from '../components/ErrorMessage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    try {
      await api.post('/auth/register', { email: form.email, password: form.password });
      navigate('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-white/50">Join Digital Heroes and start making an impact</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="input" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={form.password} onChange={set('password')} className="input" required />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="password" value={form.confirm} onChange={set('confirm')} className="input" required />
          </div>
          <ErrorMessage message={error} />
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
