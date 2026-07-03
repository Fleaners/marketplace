import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Neutral palette (warm marketplace aesthetic)
        neutral: {
          50: '#FFFAF5',
          100: '#FFF7ED',
          200: '#F5F0E6',
          300: '#E8E0D5',
          400: '#D4C5B5',
          500: '#9B8B7E',
          600: '#6B5D52',
          700: '#4A423D',
          800: '#333028',
          900: '#1F1C1A',
          950: '#0F0D0B',
        },
        // Accent colors (marketplace orange)
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          400: '#FB923C',
          500: '#FF9500', // marketplace.store orange
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Status colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Legacy colors (keeping for compatibility)
        ink: '#1F1C1A',
        premium: '#FF9500',
      },
      fontSize: {
        'headline-1': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-2': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.15)',
        xl: '0 20px 25px rgba(0,0,0,0.2)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        premium: '0 18px 42px rgba(16, 21, 34, 0.16)',
      },
      backdropBlur: {
        xs: 'blur(2px)',
        sm: 'blur(4px)',
        md: 'blur(8px)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 0% 0%, rgba(245, 158, 11, 0.25), transparent 45%), radial-gradient(circle at 100% 100%, rgba(11, 109, 255, 0.2), transparent 42%)',
      },
    },
  },
  plugins: [],
};

export default config;
