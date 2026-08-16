import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
    },
  },
  plugins: [],
};

export default config;
