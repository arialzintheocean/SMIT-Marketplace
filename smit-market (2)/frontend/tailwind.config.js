export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#12264a', 700: '#1d3868', 50: '#eef2f9' },
        mint: { DEFAULT: '#3fd6a0', 600: '#1fae7e', 50: '#e9fbf4', 100: '#c9f5e5' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
}
