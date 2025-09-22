import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styling/index.scss';
import formatting from './plugins/formatting';
import FloatingVue from 'floating-vue';
import notificationsStore from './stores/notifications.store';

declare module 'vue' {
    interface ComponentCustomProperties {
        $format(value: string | number | null | undefined): string;
    }
}

addFetchInterceptor();

const app = createApp(App);

app
    .use(router)
    .use(formatting)
    .use(FloatingVue);

app.mount('#app');


function addFetchInterceptor() {
    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        const [resource, options] = args;

        const response = await originalFetch(resource, options);

        if (response.status !== 200) {
            let text = 'Could not perform action against Relewise, due to missing permissions on the API Key.';

            if (response.status === 400) {
                text = 'The App does not support the expected scenario. Contact Relewise for help.';
            }

            if (response.status === 500) {
                text = 'There was an unexpected error on your dataset. Contact Relewise for help.';
            }

            notificationsStore.push({ title: `An error occurred (${response.status.toString()})`, text: text });
        }

        return response;
    };
}