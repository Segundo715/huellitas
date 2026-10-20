import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Tokens de shadcn/ui (definidos en app/globals.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        warm: 'hsl(var(--warm))',
        sidebar: 'hsl(var(--sidebar))',
        // Paleta histórica del proyecto (usada por las pantallas existentes)
        brand: {
          primary: '#0284c7',
          light: '#38bdf8',
          dark: '#0369a1',
          soft: '#e0f2fe',
          slate900: '#0f172a',
          slate800: '#1e293b',
          white: 'hsl(var(--card))',
          slate50: 'hsl(var(--muted))',
          border: 'hsl(var(--border))',
          text: 'hsl(var(--foreground))',
          muted: 'hsl(var(--muted-foreground))',
          danger: '#ef4444',
          success: '#16a34a',
          warning: '#d97706',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--shadow-color) / 0.04), 0 10px 30px hsl(var(--shadow-color) / 0.07)',
        card: '0 1px 2px hsl(var(--shadow-color) / 0.04), 0 8px 24px hsl(var(--shadow-color) / 0.06)',
        lift: '0 2px 4px hsl(var(--shadow-color) / 0.05), 0 18px 40px -8px hsl(var(--shadow-color) / 0.16)',
        glow: '0 0 0 1px hsl(var(--primary) / 0.15), 0 10px 40px -10px hsl(var(--primary) / 0.55)',
      },
    },
  },
  plugins: [animate],
};

export default config;
