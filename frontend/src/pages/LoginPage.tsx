import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-white/50">Sign in to your Digital Heroes account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>
          <ErrorMessage message={error} />
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-500 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
