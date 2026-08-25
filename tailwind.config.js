/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system tokens — dark-first
        bg: {
          DEFAULT: '#0a0a0a',
          surface: '#111111',
          elevated: '#161616',
          overlay: '#1a1a1a',
          hover: '#1e1e1e',
        },
        border: {
          DEFAULT: '#222222',
          subtle: '#1a1a1a',
          strong: '#333333',
        },
        fg: {
          DEFAULT: '#f0f0f0',
          secondary: '#888888',
          muted: '#555555',
          disabled: '#333333',
        },
        accent: {
          DEFAULT: '#ffffff',
          secondary: '#a3a3a3',
        },
        success: {
          DEFAULT: '#4ade80',
          muted: 'rgba(74,222,128,0.1)',
        },
        danger: {
          DEFAULT: '#f87171',
          muted: 'rgba(248,113,113,0.1)',
        },
        warning: {
          DEFAULT: '#fbbf24',
          muted: 'rgba(251,191,36,0.1)',
        },
        blue: {
          DEFAULT: '#60a5fa',
          muted: 'rgba(96,165,250,0.1)',
        },
        violet: {
          DEFAULT: '#a78bfa',
          muted: 'rgba(167,139,250,0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
        badge: '6px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 0 0 1px #222222',
        'card-hover': '0 0 0 1px #333333',
        glow: '0 0 20px rgba(255,255,255,0.04)',
        'glow-success': '0 0 20px rgba(74,222,128,0.15)',
        'glow-danger': '0 0 20px rgba(248,113,113,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
