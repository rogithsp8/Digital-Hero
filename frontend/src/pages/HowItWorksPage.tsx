import { motion } from 'framer-motion';

const steps = [
  {
    title: 'Subscribe',
    body: 'Choose a monthly (£9.99) or yearly (£95.88) plan. At least 10% of your subscription goes directly to your chosen charity — you can increase this at any time.',
  },
  {
    title: 'Log your scores',
    body: 'After each round, enter your Stableford score (1–45) and the date you played. We keep your last 5 scores. Each score becomes one of your draw numbers.',
  },
  {
    title: 'Enter the monthly draw',
    body: 'At the end of each month, we run a draw. Five winning numbers are selected. Match 3, 4, or 5 of your scores to win a share of the prize pool.',
  },
  {
    title: 'Prize tiers',
    body: '5 matches = 40% of the pool. 4 matches = 35%. 3 matches = 25%. If multiple people match the same tier, the prize is split equally. The 5-match jackpot rolls over if unclaimed.',
  },
  {
    title: 'Verify & get paid',
    body: 'Winners upload a screenshot of their scores from their golf platform. Our team verifies and processes payment. Simple.',
  },
  {
    title: 'Your charity wins too',
    body: 'Regardless of whether you win a prize, your chosen charity receives their share of your subscription every single month.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">How Digital Heroes works</h1>
          <p className="text-white/50 text-lg">Golf meets giving meets winning.</p>
        </div>

        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="card flex gap-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
