import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        surface: {
          DEFAULT: "#111113",
          raised: "#18181b",
          overlay: "#1c1c1f",
        },
        edge: {
          DEFAULT: "#27272a",
          strong: "#3f3f46",
        },
        fg: {
          DEFAULT: "#fafafa",
          secondary: "#a1a1aa",
          muted: "#71717a",
          dim: "#52525b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
