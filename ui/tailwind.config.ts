// tailwind.config.ts
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: "class", // Use a string instead of an array
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
		blueberry: {
			darker1: '#242c44',
			default: '#333e60',
			lighter1: '#858a99',
		  },
		blue: {
		darker1: '#186cbe',
		default: '#1576d1',
		lighter1: '#1388e6',
		light: '#2686e1',
		lighter2: '#e8f2f9',
		},
		cobalt: {
		light: '#f0effd',
		default: '#4644df',
		darker1: '#23239b',
		darker2: '#242c44',
		},
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        heading: ['Lora', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
	  fontSize: {
        'heading-title': '4.9rem',
        'heading-1': '4.5rem',
        'heading-2': '3.8rem',
        'heading-3': '3.3rem',
        'heading-4': '2.8rem',
        'heading-5': '2.4rem',
        'heading-6': '2.1rem',
        // Add other custom font sizes...
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    typography,
  ],
};

export default config;
