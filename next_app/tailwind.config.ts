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
        ink: '#101522',
        accent: '#f59e0b',
        premium: '#0b6dff',
      },
      boxShadow: {
        premium: '0 18px 42px rgba(16, 21, 34, 0.16)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 0% 0%, rgba(245, 158, 11, 0.25), transparent 45%), radial-gradient(circle at 100% 100%, rgba(11, 109, 255, 0.2), transparent 42%)',
      },
    },
  },
  plugins: [],
};

export default config;
