/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: '#050505',
            light: '#1A1A1D',
            dark: '#080808',
            deep: '#000000'
          },
          gold: {
            light: '#E7C66A',
            DEFAULT: '#C9A227',
            dark: '#8F6F18'
          },
          accent: {
            DEFAULT: '#C8102E',
            green: '#22C55E',
            red: '#DA291C'
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 14px 34px -18px rgba(0, 0, 0, 0.9)',
        'premium-glow': '0 0 18px rgba(218, 41, 28, 0.22)',
        'premium-glow-heavy': '0 0 30px rgba(218, 41, 28, 0.35)',
      }
    },
  },
  plugins: [],
}
