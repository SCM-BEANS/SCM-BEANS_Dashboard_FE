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
        background: "#ffffff",
        primary: "#000000",
        "primary-container": "#222222",
        "on-primary": "#ffffff",
        secondary: "#555555",
        "secondary-container": "#e0e0e0",
        "on-secondary": "#ffffff",
        tertiary: "#333333",
        "tertiary-container": "#cccccc",
        "on-tertiary": "#ffffff",
        surface: "#ffffff",
        "surface-bright": "#f9f9f9",
        "surface-dim": "#eaeaea",
        "surface-container": "#f4f4f4",
        "surface-container-low": "#fafafa",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#000000",
        "on-surface-variant": "#666666",
        outline: "#dddddd",
        "outline-variant": "#eeeeee",
        error: "#ff0000",
        "on-error": "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
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
