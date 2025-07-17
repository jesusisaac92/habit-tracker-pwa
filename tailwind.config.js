/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                'sheet-in': {
                    '0%': { transform: 'translateY(100%)' },
                    '60%': { transform: 'translateY(5%)' },
                    '80%': { transform: 'translateY(2%)' },
                    '100%': { transform: 'translateY(0)' }
                },
                'sheet-out': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(100%)' }
                }
            },
            animation: {
                'sheet-in': 'sheet-in 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                'sheet-out': 'sheet-out 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }
        },
    },
    plugins: [],
}