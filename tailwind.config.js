/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm "greenhouse" palette.
        canopy: {
          50: '#f0fdf4',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        soil: {
          50: '#e7f3ec', // light mint — primary text on dark
          100: '#d4e9dc',
          700: '#1e3d29',
          800: '#16301f',
          850: '#10231a',
          900: '#0b1a12', // deep green-black background
        },
        bark: '#3f2d23',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        rise: 'rise 0.35s ease-out',
        pop: 'pop 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
