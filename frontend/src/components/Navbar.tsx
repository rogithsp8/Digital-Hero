import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, subscription, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/charities', label: 'Charities' },
    { to: '/how-it-works', label: 'How It Works' },
    ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', accent: true }] : []),
  ];

  function handleLogout() {
    logout();
    navigate('/');
    setMobileOpen(false);
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <span className="text-brand-500">⬡</span> Digital Heroes
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`hover:text-white transition-colors ${l.accent ? 'text-accent-400' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-white/40 truncate max-w-[160px]">{user.email}</span>
              {subscription?.status !== 'active' && (
                <Link to="/subscribe" className="btn-primary text-sm py-2 px-4">Subscribe</Link>
              )}
              <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <div className="w-5 space-y-1">
            <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface-2 border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2.5 px-3 rounded-lg text-sm hover:bg-white/5 transition-colors ${l.accent ? 'text-accent-400' : 'text-white/70'}`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-white/5 space-y-2">
                {user ? (
                  <>
                    <div className="text-xs text-white/30 px-3 pb-1">{user.email}</div>
                    {subscription?.status !== 'active' && (
                      <Link to="/subscribe" onClick={() => setMobileOpen(false)} className="btn-primary w-full justify-center text-sm">Subscribe</Link>
                    )}
                    <button onClick={handleLogout} className="btn-secondary w-full justify-center text-sm">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full justify-center text-sm">Sign in</Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full justify-center text-sm">Get started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
