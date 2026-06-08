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
            DEFAULT: '#0B132B',
            light: '#1C2541',
            dark: '#050A18',
            deep: '#02040A'
          },
          gold: {
            light: '#F4D35E',
            DEFAULT: '#D4AF37',
            dark: '#A67C1E'
          },
          accent: {
            DEFAULT: '#38BDF8', // soft sky blue
            green: '#10B981', // emerald success
            red: '#EF4444' // red error/bid alert
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
        'premium-glow': '0 0 20px rgba(212, 175, 55, 0.15)',
        'premium-glow-heavy': '0 0 35px rgba(212, 175, 55, 0.3)',
      }
    },
  },
  plugins: [],
}
