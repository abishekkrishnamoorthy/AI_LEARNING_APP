/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        lpurple: '#E6E6FA',
        palm: '#C8A2C8',
        blue: '#4A90E2',
        lgray: '#F5F5F5',
        bgray: '#E0E0E0',
        dark: '#1A1A1A',
        cta: '#7B5EA7',
        'cta-hover': '#6B51C4',
      },
      fontFamily: {
        body: ['DM Sans', 'sans-serif'],
        heading: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
}
