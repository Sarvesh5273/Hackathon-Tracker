/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        appbg: '#0a0a0a',
        card: '#141414',
        border: '#2a2a2a',
        primaryText: '#e0e0e0',
        secondaryText: '#888888',
        urgencyGreen: '#22c55e',
        urgencyAmber: '#f59e0b',
        urgencyRed: '#ef4444'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        terminal: '0 0 0 1px rgba(255,255,255,0.04), 0 12px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};
