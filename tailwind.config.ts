import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			surface: 'hsl(var(--surface))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: 'hsl(var(--success))',
  			warning: 'hsl(var(--warning))',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			casino: {
				bg: {
					from: 'hsl(var(--casino-bg-from))',
					to: 'hsl(var(--casino-bg-to))'
				},
				surface: 'hsl(var(--casino-surface))',
				card: {
					DEFAULT: 'hsl(var(--casino-card))',
					hover: 'hsl(var(--casino-card-hover))'
				},
				border: 'hsl(var(--casino-border))',
				neon: 'hsl(var(--casino-neon))',
				gold: {
					DEFAULT: 'hsl(var(--casino-gold))',
					dim: 'hsl(var(--casino-gold-dim))'
				}
			},
			dtx: {
				bg: 'hsl(var(--dtx-bg))',
				panel: 'hsl(var(--dtx-panel))',
				panel2: 'hsl(var(--dtx-panel-2))',
				border: 'hsl(var(--dtx-border))',
				text: 'hsl(var(--dtx-text))',
				muted: 'hsl(var(--dtx-muted))',
				mint: 'hsl(var(--dtx-mint))',
				'mint-bright': 'hsl(var(--dtx-mint-bright))',
				win: 'hsl(var(--dtx-win))',
				loss: 'hsl(var(--dtx-loss))',
				gold: 'hsl(var(--dtx-gold))',
				orange: 'hsl(var(--dtx-orange))',
				cyan: 'hsl(var(--dtx-cyan))',
				purple: 'hsl(var(--dtx-purple))',
				'red-hot': 'hsl(var(--dtx-red-hot))',
				'neon-pink': 'hsl(var(--dtx-neon-pink))',
				'green-win': 'hsl(var(--dtx-green-win))'
			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			display: [
  				'Rajdhani',
  				'Orbitron',
  				'Space Grotesk',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'serif'
  			],
  			mono: [
  				'Orbitron',
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'monospace'
  			]
  		},
  		backgroundImage: {
  			'gradient-aurora': 'var(--gradient-aurora)',
  			'gradient-hero': 'var(--gradient-hero)',
  			'gradient-card': 'var(--gradient-card)'
  		},
  		boxShadow: {
  			glow: 'var(--shadow-glow)',
  			card: 'var(--shadow-card)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-20px)'
  				}
  			},
  			glow: {
  				'0%, 100%': {
  					opacity: '0.5'
  				},
  				'50%': {
  					opacity: '1'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-right': {
  				'0%': { opacity: '0', transform: 'translateX(30px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' }
  			},
  			'pulse-mint': {
  				'0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--dtx-mint) / 0.6)' },
  				'50%': { boxShadow: '0 0 0 12px hsl(var(--dtx-mint) / 0)' }
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'count-up': {
  				'0%': { transform: 'translateY(8px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			marquee: {
  				'0%': { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-50%)' }
  			},
  			'pulse-glow': {
  				'0%, 100%': { boxShadow: '0 0 16px hsl(var(--dtx-gold) / 0.45), 0 0 32px hsl(var(--dtx-orange) / 0.3)' },
  				'50%': { boxShadow: '0 0 28px hsl(var(--dtx-gold) / 0.85), 0 0 56px hsl(var(--dtx-orange) / 0.55)' }
  			},
  			'wheel-spin': {
  				'0%': { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(1800deg)' }
  			},
  			'border-rainbow': {
  				'0%, 100%': { borderColor: 'hsl(var(--dtx-gold))' },
  				'33%': { borderColor: 'hsl(var(--dtx-neon-pink))' },
  				'66%': { borderColor: 'hsl(var(--dtx-green-win))' }
  			},
  			'coin-flip': {
  				'0%, 100%': { transform: 'rotateY(0deg)' },
  				'50%': { transform: 'rotateY(180deg)' }
  			},
  			'gradient-x': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			},
  			'border-spin': {
  				'0%': { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(360deg)' }
  			},
  			'ring-pulse': {
  				'0%': { transform: 'scale(1)', opacity: '0.7' },
  				'100%': { transform: 'scale(1.6)', opacity: '0' }
  			},
  			'orb-float': {
  				'0%, 100%': { transform: 'translate(0,0) scale(1)' },
  				'50%': { transform: 'translate(30px,-40px) scale(1.1)' }
  			},
  			'float-slow': {
  				'0%, 100%': { transform: 'translateY(0) rotate(var(--tw-rotate,0))' },
  				'50%': { transform: 'translateY(-18px) rotate(var(--tw-rotate,0))' }
  			},
  			bubble: {
  				'0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
  				'10%': { opacity: '0.7' },
  				'100%': { transform: 'translateY(-110vh) scale(1.4)', opacity: '0' }
  			},
  			'coin-3d': {
  				'0%': { transform: 'translate3d(var(--cx,0),-20vh,var(--cz,0)) rotateY(0deg) rotateX(15deg)', opacity: '0' },
  				'10%': { opacity: '1' },
  				'100%': { transform: 'translate3d(var(--cx,0),120vh,var(--cz,0)) rotateY(1440deg) rotateX(15deg)', opacity: '0' }
  			},
  			'tilt-float-3d': {
  				'0%,100%': { transform: 'translateZ(0) rotateY(-8deg) rotateX(6deg) translateY(0)' },
  				'50%': { transform: 'translateZ(40px) rotateY(8deg) rotateX(-4deg) translateY(-14px)' }
  			},
  			'flip-3d-in': {
  				'0%': { transform: 'rotateY(-90deg)', opacity: '0' },
  				'100%': { transform: 'rotateY(0deg)', opacity: '1' }
  			},
  			'star-drift': {
  				'0%': { transform: 'translate3d(0,0,0)' },
  				'100%': { transform: 'translate3d(-120px,80px,0)' }
  			},
  			'fly-in-3d': {
  				'0%': { transform: 'perspective(900px) translateZ(-600px) rotateX(20deg)', opacity: '0' },
  				'100%': { transform: 'perspective(900px) translateZ(0) rotateX(0)', opacity: '1' }
  			},
  			'reel-flip': {
  				'0%': { transform: 'rotateX(0deg)' },
  				'100%': { transform: 'rotateX(-90deg)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			float: 'float 6s ease-in-out infinite',
  			glow: 'glow 3s ease-in-out infinite',
  			'fade-in-up': 'fade-in-up 0.6s ease-out',
  			'slide-in-right': 'slide-in-right 0.6s ease-out',
  			'pulse-mint': 'pulse-mint 2s ease-in-out infinite',
  			shimmer: 'shimmer 2.4s linear infinite',
  			'count-up': 'count-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
  			marquee: 'marquee 38s linear infinite',
  			'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
  			'wheel-spin': 'wheel-spin 4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
  			'border-rainbow': 'border-rainbow 3s linear infinite',
  			'coin-flip': 'coin-flip 1.6s ease-in-out infinite',
  			'gradient-x': 'gradient-x 6s ease infinite',
  			'border-spin': 'border-spin 6s linear infinite',
  			'ring-pulse': 'ring-pulse 1.8s cubic-bezier(0,0,0.2,1) infinite',
  			'orb-float': 'orb-float 12s ease-in-out infinite',
  			'float-slow': 'float-slow 7s ease-in-out infinite',
  			bubble: 'bubble 12s linear infinite',
  			'coin-3d': 'coin-3d 6s linear infinite',
  			'tilt-float-3d': 'tilt-float-3d 7s ease-in-out infinite',
  			'flip-3d-in': 'flip-3d-in 0.6s cubic-bezier(0.22,1,0.36,1) both',
  			'star-drift': 'star-drift 30s linear infinite',
  			'fly-in-3d': 'fly-in-3d 0.7s cubic-bezier(0.22,1,0.36,1) both',
  			'reel-flip': 'reel-flip 0.45s ease-in both'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
