/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        night: '#000F08',
        imperial: '#FB3640',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-main':    'linear-gradient(135deg, #000F08, #FB3640)',
        'gradient-reverse': 'linear-gradient(135deg, #FB3640, #000F08)',
        'gradient-btn':     'linear-gradient(90deg, #000F08, #FB3640)',
        'gradient-subtle':  'linear-gradient(135deg, #000F08 60%, #3d0509 100%)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
