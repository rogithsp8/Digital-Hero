/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce6ff',
          500: '#4f6ef7',
          600: '#3b55e6',
          700: '#2d42c9',
          900: '#1a2580',
        },
        accent: {
          400: '#f97316',
          500: '#ea6c0a',
        },
        surface: '#0f1117',
        'surface-2': '#1a1d2e',
        'surface-3': '#252840',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
