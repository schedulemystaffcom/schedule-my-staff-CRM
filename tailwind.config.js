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
          50:  "#EEF2FB",
          100: "#dce6f7",
          200: "#A8BEE8",
          500: "#4169E1",
          600: "#2A4FB5",
          700: "#172D6E",
        },
        yolk: {
          50:  "#FEF8E7",
          200: "#FADA7A",
          400: "#F5C014",
          600: "#C9950A",
          800: "#7A5A04",
        },
        ink: "#1A1A2E",
      },
    },
  },
  plugins: [],
};
