/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'brand-50': '#EEF2F5',
                'brand-100': '#D9E2EA',
                'brand-200': '#B7C9D8',
                'brand-300': '#8BA8C0',
                'brand-400': '#5F86A6',
                'brand-500': '#3B5777',
                'brand-600': '#294968',
                'brand-700': '#144164',
                'brand-800': '#103653',
                'brand-900': '#09243A',
            },
        },
    },
    plugins: [],
};
