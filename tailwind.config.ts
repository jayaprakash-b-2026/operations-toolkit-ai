import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17251f",
        muted: "#78847d",
        forest: "#26734d",
        canvas: "#f5f7f4",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
