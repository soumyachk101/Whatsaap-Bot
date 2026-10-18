/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FDFCF8',
        foreground: '#2C2C24',
        surface: '#FEFEFA',
        primary: {
          DEFAULT: '#5D7052',
          foreground: '#F3F4F1',
          hover: '#4E5F44',
          subtle: 'rgba(93, 112, 82, 0.1)',
        },
        secondary: {
          DEFAULT: '#C18C5D',
          foreground: '#FFFFFF',
          hover: '#A97548',
          subtle: 'rgba(193, 140, 93, 0.12)',
        },
        accent: {
          DEFAULT: '#E6DCCD',
          foreground: '#4A4A40',
        },
        muted: {
          DEFAULT: '#F0EBE5',
          foreground: '#78786C',
        },
        timber: '#DED8CF',
        loam: '#2C2C24',
        bark: '#4A4A40',
        stone: '#F0EBE5',
        destructive: '#A85448',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Nunito', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'organic-1': '60% 40% 30% 70% / 60% 30% 70% 40%',
        'organic-2': '30% 70% 70% 30% / 30% 30% 70% 70%',
        'organic-3': '50% 50% 30% 70% / 50% 60% 40% 50%',
        'blob': '40% 60% 70% 30% / 40% 50% 60% 50%',
        '2rem': '2rem',
        '3rem': '3rem',
        '4rem': '4rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(93, 112, 82, 0.15)',
        'float': '0 10px 40px -10px rgba(193, 140, 93, 0.2)',
        'lift': '0 20px 40px -10px rgba(93, 112, 82, 0.15)',
        'moss-glow': '0 0 24px rgba(93, 112, 82, 0.25)',
      },
    },
  },
  plugins: [],
}
