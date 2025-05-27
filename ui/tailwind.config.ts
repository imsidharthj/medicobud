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
        // Keyframes for pulse effect on chat bubble
        'pulse-subtle': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        // Keyframes for typing indicator dots
        'bounce-dot': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        // Keyframes for abstract background blobs in hero section
        'blob': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        // Keyframes for soft pulse on idle chat prompt
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0, 0, 0, 0)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'pulse-subtle': 'pulse-subtle 2s infinite ease-in-out',
        'bounce-dot': 'bounce-dot 0.8s infinite ease-in-out',
        'blob': 'blob 7s infinite ease-in-out',
        'pulse-soft': 'pulse-soft 2s infinite ease-in-out',
      },
      transitionTimingFunction: {
        // Custom easing for the hero section drop-in animation
        'out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
      animationDelay: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '2000': '2000ms',
      },
      transitionDelay: {
        '0': '0ms',
        '150': '150ms',
        '300': '300ms',
        '450': '450ms',
        '600': '600ms',
        '750': '750ms',
        '900': '900ms',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    typography,
  ],
};

export default config;
