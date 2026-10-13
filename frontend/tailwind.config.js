/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.35)' },
          '50%': { boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'soft-glow': 'soft-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
