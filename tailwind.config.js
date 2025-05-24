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
      boxShadow: {
        'neon-pink': '0 0 5px #FF2A6D, 0 0 10px #FF2A6D',
        'neon-blue': '0 0 5px #05D9E8, 0 0 10px #05D9E8',
        'neon-purple': '0 0 5px #9D4EDD, 0 0 10px #9D4EDD',
        'neon-yellow': '0 0 5px #F9C80E, 0 0 10px #F9C80E',
        'neon-green': '0 0 5px #2DE2E6, 0 0 10px #2DE2E6',
    },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glitch': 'glitch 0.3s infinite',
        'matrix': 'matrix 20s linear infinite',
        'typing': 'typing 1s ease-in-out infinite',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px currentColor' },
          '100%': { textShadow: '0 0 20px currentColor, 0 0 30px currentColor' }
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(2px, -2px)' },
          '60%': { transform: 'translate(-2px, -2px)' },
          '80%': { transform: 'translate(2px, 2px)' },
          '100%': { transform: 'translate(0)' }
      },
      matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
      },
      typing: {
        '0%, 50%': { opacity: '1' },
        '51%, 100%': { opacity: '0' }
    },
    slideIn: {
        'from': { opacity: '0', transform: 'translateY(20px)' },
        'to': { opacity: '1', transform: 'translateY(0)' }
    }
      },
    },
  },
  plugins: [],
}
