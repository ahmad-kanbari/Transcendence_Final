module.exports = {
  content: [
    "./*.{html,js}",
    "./src/**/*.{html,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'cyber-pink': '#FF2A6D',
        'cyber-blue': '#05D9E8',
        'cyber-purple': '#9D4EDD',
        'cyber-yellow': '#F9C80E',
        'cyber-green': '#2DE2E6',
        'cyber-dark': '#0F0F1B',
        'cyber-darker': '#070718',
        'cyber-black': '#030303',
      },
      fontFamily: {
        'cyber': ['Orbitron', 'sans-serif'],
        'body': ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neon-pink': '0 0 5px #FF2A6D, 0 0 10px #FF2A6D',
        'neon-blue': '0 0 5px #05D9E8, 0 0 10px #05D9E8',
        'neon-purple': '0 0 5px #9D4EDD, 0 0 10px #9D4EDD',
        'neon-yellow': '0 0 5px #F9C80E, 0 0 10px #F9C80E',
        'neon-green': '0 0 5px #2DE2E6, 0 0 10px #2DE2E6',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(11, 11, 22, 0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 11, 22, 0.9) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '30px 30px',
      },
      animation: {
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          'from': { 'text-shadow': '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #05D9E8, 0 0 20px #05D9E8' },
          'to': { 'text-shadow': '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #05D9E8, 0 0 40px #05D9E8' },
        }
      },
    },
  },
  plugins: [],
}
