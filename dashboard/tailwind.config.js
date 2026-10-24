/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f9fc',
        foreground: '#1a1d2b',
        surface: '#ffffff',
        'surface-2': '#f1f3f9',
        primary: {
          DEFAULT: '#4f8ef7',
          foreground: '#ffffff',
          hover: '#3a7ae8',
          subtle: 'rgba(79, 142, 247, 0.1)',
        },
        secondary: {
          DEFAULT: '#34c77b',
          foreground: '#ffffff',
          hover: '#28a866',
          subtle: 'rgba(52, 199, 123, 0.1)',
        },
        warning: {
          DEFAULT: '#f5a623',
          subtle: 'rgba(245, 166, 35, 0.1)',
        },
        danger: {
          DEFAULT: '#f0544f',
          subtle: 'rgba(240, 84, 79, 0.1)',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          subtle: 'rgba(139, 92, 246, 0.1)',
        },
        muted: {
          DEFAULT: '#f1f3f9',
          foreground: '#6b7080',
        },
        border: '#e2e5f0',
        'border-strong': '#c8cde0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
        'elevated': '0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)',
        'glow': '0 0 0 3px rgba(79,142,247,0.15)',
      },
    },
  },
  plugins: [],
}
