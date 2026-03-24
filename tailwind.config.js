/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cobalt: {
          50:  "#EAF1F7",
          100: "#D0E1EE",
          200: "#86BBD8",   // Sky Blue
          500: "#4A7DA8",
          600: "#33658A",   // Core Blue — primary buttons, links
          700: "#2F4858",   // Deep Navy — sidebar, dark backgrounds
        },
        yolk: {
          50:  "#FEF6E5",
          200: "#FBD88A",
          400: "#F6AE2D",   // Golden Yellow — highlights, emphasis
          600: "#C48A1A",
          800: "#7A5504",
        },
        signal: {
          50:  "#FEF0E6",
          100: "#FDDCC6",
          400: "#F26419",   // Signal Orange — urgency, CTAs
          600: "#D14E0D",
        },
        ink: "#2F4858",     // Deep Navy — primary text
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['var(--font-lora)', 'Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
