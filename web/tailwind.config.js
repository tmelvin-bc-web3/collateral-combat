/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			bg: {
  				primary: '#080705',
  				secondary: '#0d0b09',
  				tertiary: '#151210',
  				hover: '#1f1a16'
  			},
  			border: 'hsl(var(--border))',
  			text: {
  				primary: '#e8dfd4',
  				secondary: '#8a7f72',
  				tertiary: '#5c5348'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				hover: '#ff7733',
  				muted: 'rgba(255, 85, 0, 0.15)',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			success: {
  				DEFAULT: '#7fba00',
  				muted: 'rgba(127, 186, 0, 0.15)'
  			},
  			danger: {
  				DEFAULT: '#cc2200',
  				muted: 'rgba(204, 34, 0, 0.15)'
  			},
  			warning: {
  				DEFAULT: '#ff5500',
  				muted: 'rgba(255, 85, 0, 0.15)'
  			},
  			rust: {
  				DEFAULT: '#8b4513',
  				light: '#a65d2e',
  				dark: '#5c2e0d'
  			},
  			fire: '#e63900',
  			chrome: '#7a7a7a',
  			sand: '#c4a574',
  			blood: '#8b0000',
  			steel: '#4a4a4a',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'SF Mono',
  				'Menlo',
  				'Monaco',
  				'monospace'
  			],
  			display: [
  				'Impact',
  				'Haettenschweiler',
  				'Arial Narrow Bold',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			DEFAULT: '4px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		backgroundImage: {
  			'rust-gradient': 'linear-gradient(135deg, #5c2e0d 0%, #8b4513 50%, #5c2e0d 100%)',
  			'fire-gradient': 'linear-gradient(180deg, #e63900 0%, #ff5500 50%, #cc2200 100%)',
  			'dome-gradient': 'radial-gradient(ellipse at center, #151210 0%, #080705 70%)',
  			'metal-gradient': 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #1a1a1a 100%)',
  			wasteland: 'linear-gradient(180deg, rgba(8,7,5,0.95) 0%, rgba(21,18,16,0.9) 100%)'
  		},
  		boxShadow: {
  			fire: '0 0 30px rgba(255, 85, 0, 0.4)',
  			'fire-sm': '0 0 15px rgba(255, 85, 0, 0.3)',
  			blood: '0 0 20px rgba(139, 0, 0, 0.5)',
  			rust: '0 4px 20px rgba(139, 69, 19, 0.3)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
