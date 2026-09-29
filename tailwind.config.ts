import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%, 45%, 75%": { transform: "translateX(-8px)" },
          "30%, 60%, 90%": { transform: "translateX(8px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)" },
          "50%": { boxShadow: "0 0 30px rgba(99, 102, 241, 0.8)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
        "pulse-glow": "pulseGlow 2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
