import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  screens: {
    xs: "480px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0E1C",
          deep: "#060812",
        },
        panel: {
          DEFAULT: "#10152B",
          2: "#161C38",
        },
        indigo: {
          DEFAULT: "#5B6EE8",
          deep: "#2C3A9E",
          dim: "rgba(91,110,232,0.16)",
        },
        camwood: {
          DEFAULT: "#D2603A",
          2: "#EF8C63",
          dim: "rgba(210,96,58,0.16)",
        },
        gold: {
          DEFAULT: "#DDAB4E",
          dim: "rgba(221,171,78,0.16)",
        },
        signal: {
          DEFAULT: "#4FA672",
          dim: "rgba(79,166,114,0.16)",
        },
        text: {
          DEFAULT: "#F2EEE3",
          dim: "#9A9FC4",
          faint: "#565B85",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        wrap: "1180px",
      },
      borderColor: {
        line: "rgba(178,178,235,0.10)",
        "line-soft": "rgba(178,178,235,0.06)",
      },
      borderRadius: {
        card: "18px",
        panel: "22px",
        bubble: "14px",
        code: "16px",
        cta: "24px",
      },
      boxShadow: {
        card: "0 30px 60px -30px rgba(0,0,0,0.6)",
        "btn-primary": "0 10px 26px -10px rgba(221,171,78,0.5)",
        "orb-idle": "inset 0 0 22px rgba(91,110,232,0.18), 0 0 36px -12px rgba(91,110,232,0.35)",
        "orb-listening": "inset 0 0 22px rgba(210,96,58,0.25), 0 0 40px -10px rgba(210,96,58,0.5)",
        "orb-thinking": "inset 0 0 22px rgba(221,171,78,0.25), 0 0 40px -10px rgba(221,171,78,0.5)",
      },
      keyframes: {
        "blink-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "ring-pulse": {
          "0%": { opacity: "0.85", transform: "scale(0.88)" },
          "100%": { opacity: "0", transform: "scale(1.4)" },
        },
        "wave-bar": {
          "0%, 100%": { height: "4px" },
          "50%": { height: "16px" },
        },
      },
      animation: {
        "blink-dot": "blink-dot 1.6s infinite",
        "ring-pulse": "ring-pulse 1.6s ease-out infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
