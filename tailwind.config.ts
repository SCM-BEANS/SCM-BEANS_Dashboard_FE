import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layout/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F0EB",
        primary: "#3C2415",
        "primary-container": "#1A0E07",
        "on-primary": "#F5F0EB",
        secondary: "#6F4E37",
        "secondary-container": "#E8DDD3",
        "on-secondary": "#F5F0EB",
        tertiary: "#B8860B",
        "tertiary-container": "#D4A847",
        "on-tertiary": "#1A0E07",
        surface: "#FAFAF8",
        "surface-bright": "#ffffff",
        "surface-dim": "#E8DDD3",
        "surface-container": "#F5F0EB",
        "surface-container-low": "#FAF7F5",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#3C2415",
        "on-surface-variant": "#6F4E37",
        outline: "#D4C4B7",
        "outline-variant": "#E6DCD3",
        error: "#B33A3A",
        "on-error": "#ffffff",
        // Coffee Landing Page Theme
        "coffee-cream": "#F5F0EB",
        "coffee-latte": "#E8DDD3",
        "coffee-roast": "#3C2415",
        "coffee-espresso": "#1A0E07",
        "coffee-bronze": "#B8860B",
        "coffee-gold": "#D4A847",
        "coffee-mocha": "#6F4E37",
        "coffee-steam": "#C4B5A4",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "sans-serif"],
        mono: ["var(--font-hanken)", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      spacing: {
        base: "8px",
        "container-padding-mobile": "1rem",
        "container-padding-desktop": "2.5rem",
        gutter: "1.5rem",
        "stack-sm": "0.5rem",
        "stack-md": "1rem",
        "stack-lg": "2rem",
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
