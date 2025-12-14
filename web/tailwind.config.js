/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DegenDome - Mad Max Wasteland Theme
        bg: {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1512',
          hover: '#251f1a',
        },
        border: {
          primary: '#2d2520',
          secondary: '#3d3530',
        },
        text: {
          primary: '#f5f0e8',
          secondary: '#9a918a',
          tertiary: '#5c554e',
        },
        accent: {
          DEFAULT: '#00ffcc',
          hover: '#00e6b8',
          muted: 'rgba(0, 255, 204, 0.1)',
        },
        success: {
          DEFAULT: '#39ff14',
          muted: 'rgba(57, 255, 20, 0.1)',
        },
        danger: {
          DEFAULT: '#ff3131',
          muted: 'rgba(255, 49, 49, 0.1)',
        },
        warning: {
          DEFAULT: '#ff6b00',
          muted: 'rgba(255, 107, 0, 0.1)',
        },
        // DegenDome special colors
        rust: {
          DEFAULT: '#8b4513',
          light: '#cd853f',
        },
        fire: '#ff4500',
        chrome: '#c0c0c0',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
        display: ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      backgroundImage: {
        'rust-gradient': 'linear-gradient(135deg, #8b4513 0%, #cd853f 50%, #8b4513 100%)',
        'fire-gradient': 'linear-gradient(180deg, #ff4500 0%, #ff6b00 50%, #ff3131 100%)',
        'dome-gradient': 'radial-gradient(ellipse at center, #1a1512 0%, #0a0a0a 70%)',
      },
    },
  },
  plugins: [],
};
