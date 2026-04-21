import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        aviator: {
          yellow: "#ffd447",
          red: "#d62828",
          black: "#0b0b0d",
          gold: "#f4b400",
          green: "#1f7a3f"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 212, 71, 0.2)"
      }
    }
  },
  plugins: []
};

export default config;
