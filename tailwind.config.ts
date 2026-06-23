import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101010",
        "ink-soft": "#181818",
        "ink-card": "#1c1c1c",
        red: {
          DEFAULT: "#D9291C",
          dark: "#B11F14",
        },
        cream: {
          DEFAULT: "#F4EDE2",
          dim: "#A39B8E",
          faint: "#6B655C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        label: ["var(--font-label)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        reader: "44rem",
        shell: "84rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
