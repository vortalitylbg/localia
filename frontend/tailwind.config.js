export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8b5cf6',
          primaryHover: '#a78bfa',
          accent: '#f472b6',
          accentHover: '#fb7185',
        },
        dark: {
          bg: '#0a0a0f',
          surface: '#121218',
          card: '#1a1a24',
          hover: '#252532',
        },
      },
    },
  },
  plugins: [],
}
