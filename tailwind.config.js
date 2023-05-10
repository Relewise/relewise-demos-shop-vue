/** @type {import('tailwindcss').Config} */
module.exports = {
    purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    content: [],
    theme: {
        extend: {
            colors: {
                'brand-50': '#EBEFFC',
                'brand-100': '#AFC1F4',
                'brand-200': '#91AAF0',
                'brand-300': '#7392EC',
                'brand-400': '#557BE8',
                'brand-500': '#3764E4',
                'brand-600': '#1E4FDB',
                'brand-700': '#1A44BD',
                'brand-800': '#16399F',
                'brand-900': '#112F82',
            },
        },
    },
    plugins: [],
};

