import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['featured-charities'],
    queryFn: () => api.get('/charities/featured').then(r => r.data),
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface to-surface pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium mb-6">
            ❤️ Every subscription funds a cause
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
            Play golf.<br />
            <span className="text-brand-500">Change lives.</span><br />
            Win prizes.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Digital Heroes is a subscription platform where your golf scores enter you into monthly prize draws — and every subscription directly funds the charity you choose.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-4">
              Start making an impact →
            </Link>
            <Link to="/how-it-works" className="btn-secondary text-lg px-8 py-4">
              How it works
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Impact stats */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Charities supported', value: '50+' },
            { label: 'Monthly prize pool', value: '£10k+' },
            { label: 'Min. to charity', value: '10%' },
            { label: 'Draw winners', value: 'Every month' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-brand-500 mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Three steps to impact</h2>
          <p className="text-white/50 text-center mb-16">Simple to join. Meaningful every month.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Subscribe & choose a charity', desc: 'Pick a monthly or yearly plan. Select the charity your subscription supports. At least 10% goes directly to them.' },
              { step: '02', title: 'Log your golf scores', desc: 'Enter your last 5 Stableford scores. Your scores become your draw numbers — the more you play, the more entries you get.' },
              { step: '03', title: 'Win prizes, fund good', desc: 'Every month we run a draw. Match 3, 4, or 5 numbers to win a share of the prize pool. Your charity wins regardless.' },
            ].map(item => (
              <motion.div
                key={item.step}
                className="card relative overflow-hidden"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="text-6xl font-black text-white/5 absolute top-4 right-4">{item.step}</div>
                <div className="text-brand-500 font-mono text-sm mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured charities */}
      {featured && featured.length > 0 && (
        <section className="py-24 px-4 bg-surface-2">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Featured charities</h2>
            <p className="text-white/50 text-center mb-16">Your subscription supports causes that matter.</p>

            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((c: any) => (
                <Link key={c.id} to={`/charities/${c.slug}`}>
                  <motion.div className="card hover:border-brand-500/30 transition-colors" whileHover={{ y: -4 }}>
                    {c.image_url && (
                      <img src={c.image_url} alt={c.name} className="w-full h-40 object-cover rounded-xl mb-4" />
                    )}
                    <h3 className="font-semibold mb-1">{c.name}</h3>
                    <p className="text-white/50 text-sm line-clamp-2">{c.description}</p>
                  </motion.div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/charities" className="btn-secondary">Browse all charities</Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to be a hero?</h2>
          <p className="text-white/50 mb-8">Join thousands of golfers making a difference every month.</p>
          <Link to="/register" className="btn-primary text-lg px-10 py-4">
            Join Digital Heroes
          </Link>
        </div>
      </section>
    </div>
  );
}
