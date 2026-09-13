/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        signal: {
          DEFAULT: "rgb(var(--color-signal) / <alpha-value>)",
          soft: "rgb(var(--color-signal-soft) / <alpha-value>)",
        },
        pass: { DEFAULT: "rgb(var(--color-pass) / <alpha-value>)", soft: "rgb(var(--color-pass-soft) / <alpha-value>)" },
        fail: { DEFAULT: "rgb(var(--color-fail) / <alpha-value>)", soft: "rgb(var(--color-fail-soft) / <alpha-value>)" },
        blocked: { DEFAULT: "rgb(var(--color-blocked) / <alpha-value>)", soft: "rgb(var(--color-blocked-soft) / <alpha-value>)" },
        pending: { DEFAULT: "rgb(var(--color-pending) / <alpha-value>)", soft: "rgb(var(--color-pending-soft) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
}
