import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';

//const isProd = process.env.NODE_ENV === 'production';

// https://vitejs.dev/config/
export default defineConfig({
    // build: {
    //     sourcemap: false // or 'inline' if needed
    //   },
    plugins: [vue(), vueJsx(), vueDevTools()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
    
        },  
    },
    base: undefined,  
});
