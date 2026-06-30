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
      // ── Espresso Moderne Design System ───────────────────────────────────
      colors: {
        // Legacy Zenith Brew tokens (kept for dashboard compatibility)
        background: "#FAFAF8",
        primary: "#1A1714",
        "primary-container": "#2D2A26",
        "on-primary": "#FAFAF8",
        secondary: "#7C756E",
        "secondary-container": "#F5F3F0",
        "on-secondary": "#1A1714",
        tertiary: "#5C5650",
        "tertiary-container": "#EDE9E4",
        "on-tertiary": "#1A1714",
        surface: "#FFFFFF",
        "surface-bright": "#FAFAF8",
        "surface-dim": "#F5F3F0",
        "surface-container": "#F5F3F0",
        "surface-container-low": "#FAFAF8",
        "surface-container-lowest": "#FFFFFF",
        "on-surface": "#1A1714",
        "on-surface-variant": "#7C756E",
        outline: "#E8E4DE",
        "outline-variant": "#EDE9E4",
        error: "#B00020",
        "on-error": "#FFFFFF",

        // Espresso Moderne — accent palette
        espresso: {
          "50":  "#F5EDE4",
          "100": "#EDD8C6",
          "200": "#D9B99A",
          "300": "#C49970",
          "400": "#B07D4E",
          "500": "#8B5E3C",
          "600": "#714A2D",
          "700": "#5A3A22",
          "800": "#422A17",
          "900": "#2C1B0D",
          DEFAULT: "#8B5E3C",
        },
        warm: {
          "50":  "#FAFAF8",
          "100": "#F5F3F0",
          "200": "#EDE9E4",
          "300": "#E8E4DE",
          "400": "#D4CEC7",
          "500": "#BDB6AD",
          "600": "#9B9288",
          "700": "#7C756E",
          "800": "#5C5650",
          "900": "#3D3833",
          DEFAULT: "#7C756E",
        },
        ink: {
          DEFAULT: "#1A1714",
          soft: "#2D2A26",
          muted: "#7C756E",
          subtle: "#9B9288",
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "ui-serif", "serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },

      // ── Spacing ───────────────────────────────────────────────────────────
      spacing: {
        base: "8px",
        "container-padding-mobile":  "1rem",
        "container-padding-desktop": "2.5rem",
        gutter:   "1.5rem",
        "stack-sm": "0.5rem",
        "stack-md": "1rem",
        "stack-lg": "2rem",
      },

      // ── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        sm:      "0.125rem",
        DEFAULT: "0.25rem",
        md:      "0.375rem",
        lg:      "0.5rem",
        xl:      "0.75rem",
        "2xl":   "1rem",
        "3xl":   "1.5rem",
        full:    "9999px",
      },

      // ── Max Width ─────────────────────────────────────────────────────────
      maxWidth: {
        content: "1320px",
      },

      // ── Letter Spacing ────────────────────────────────────────────────────
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.02em",
        caption:  "0.1em",
        label:    "0.15em",
        wide:     "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
