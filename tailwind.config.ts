import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
          DEFAULT: '#0d9488',
        },
        clinical: {
          25: '#f9fafb',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#3b82f6',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          DEFAULT: '#22c55e',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          DEFAULT: '#f59e0b',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          DEFAULT: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
        'sidebar': '4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -2px rgba(0, 0, 0, 0.1)',
        'glow-primary': '0 0 20px -5px rgba(13, 148, 136, 0.35)',
        'glow-accent': '0 0 20px -5px rgba(59, 130, 246, 0.35)',
        'glow-success': '0 0 20px -5px rgba(34, 197, 94, 0.35)',
        'glow-warning': '0 0 20px -5px rgba(245, 158, 11, 0.35)',
        'inner-glow': 'inset 0 1px 2px rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, transparent 50%), linear-gradient(225deg, var(--tw-gradient-to) 0%, transparent 50%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'stagger-1': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
        'stagger-2': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'stagger-3': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
        'stagger-4': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'eq-1': 'eqBar1 2.8s ease-in-out infinite',
        'eq-2': 'eqBar2 3.2s ease-in-out infinite',
        'eq-3': 'eqBar3 2.5s ease-in-out infinite',
        'eq-4': 'eqBar4 3.6s ease-in-out infinite',
        'eq-5': 'eqBar5 2.9s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'process-sweep': 'processSweep 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(13, 148, 136, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)' },
        },
        // Smooth equalizer bars for recording waveform
        eqBar1: {
          '0%, 100%': { height: '20%' },
          '25%': { height: '80%' },
          '50%': { height: '45%' },
          '75%': { height: '95%' },
        },
        eqBar2: {
          '0%, 100%': { height: '55%' },
          '20%': { height: '30%' },
          '45%': { height: '90%' },
          '70%': { height: '40%' },
        },
        eqBar3: {
          '0%, 100%': { height: '40%' },
          '30%': { height: '95%' },
          '55%': { height: '25%' },
          '80%': { height: '70%' },
        },
        eqBar4: {
          '0%, 100%': { height: '70%' },
          '15%': { height: '35%' },
          '40%': { height: '85%' },
          '65%': { height: '50%' },
          '85%': { height: '95%' },
        },
        eqBar5: {
          '0%, 100%': { height: '30%' },
          '20%': { height: '75%' },
          '50%': { height: '50%' },
          '75%': { height: '90%' },
        },
        // Gentle breathing pulse for recording dot
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
        // Processing shimmer sweep
        processSweep: {
          '0%': { height: '15%', opacity: '0.4' },
          '50%': { height: '85%', opacity: '1' },
          '100%': { height: '15%', opacity: '0.4' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config

