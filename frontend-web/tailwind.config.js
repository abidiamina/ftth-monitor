/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1E3A5F', light: '#2E75B6', pale: '#D5E8F0' },
        ftth: {
          admin: '#7C3AED',
          responsable: '#2563EB',
          technicien: '#059669',
          client: '#D97706'
        },
        status: {
          pending: '#F59E0B',
          inprogress: '#3B82F6',
          done: '#10B981',
          cancelled: '#EF4444'
        },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', '"Geist Variable"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
