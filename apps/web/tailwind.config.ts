import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Operational Design System tokens from UX_UI_DESIGN_SYSTEM.md
        canvas: {
          light: "#F6F7F9",
          dark: "#111318",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#171A21",
        },
        surfaceSecondary: {
          light: "#F0F2F5",
          dark: "#20242D",
        },
        textPrimary: {
          light: "#17191C",
          dark: "#F1F3F5",
        },
        textMuted: {
          light: "#626B76",
          dark: "#A4ACB8",
        },
        borderBase: {
          light: "#E1E5EA",
          dark: "#2D333D",
        },
        accent: {
          DEFAULT: "#4657C8",
          hover: "#3948B0",
          light: "#EEF0FC",
          dark: "#2B3363",
        },
        status: {
          success: "#16794B",
          warning: "#9A6700",
          danger: "#C23934",
          info: "#2563A6",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SFMono-Regular"',
          "Consolas",
          '"Liberation Mono"',
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
