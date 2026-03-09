import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // We'll also keep access to standard colors just in case
        slate: colors.slate,
        emerald: colors.emerald,
        violet: colors.violet,
        indigo: colors.indigo,
        amber: colors.amber,
        rose: colors.rose,
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'bounce-subtle': 'bounceSub 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceSub: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'panel': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'prompt': '0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)',
        'card': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
};
export default config;
