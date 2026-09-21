/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f1ff",
          100: "#e6e4ff",
          200: "#cdc9ff",
          300: "#a8a0ff",
          400: "#7d6dff",
          500: "#5b3fff",
          600: "#4a26f5",
          700: "#3e1cd1",
          800: "#3319a8",
          900: "#2c1985",
        },
      },
    },
  },
  plugins: [],
};
