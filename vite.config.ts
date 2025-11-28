import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

//const isProd = process.env.NODE_ENV === 'production';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(
            {
                template: {
                    compilerOptions: {
                        // treat <relewise-*> and <app-*> as custom elements
                        isCustomElement: (tag) => tag.startsWith('relewise-') || tag.startsWith('app-'),
                    }
                }
            }
        ),
        vueJsx()
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    base: undefined,
});
