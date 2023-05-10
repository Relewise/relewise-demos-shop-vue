import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styling/index.scss';
import formatting from './plugins/formatting';

declare module 'vue' {
    interface ComponentCustomProperties {
        $format(value: string | number | null | undefined): string;
      }
}

const app = createApp(App);

app
    .use(router)
    .use(formatting);

app.mount('#app');
