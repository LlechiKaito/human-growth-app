import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rpg: {
          bg: '#0f0a1f',
          card: '#1a1330',
          accent: '#f5a623',
          xp: '#7ed957',
          health: '#e74c3c',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
