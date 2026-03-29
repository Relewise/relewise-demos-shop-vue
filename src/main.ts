import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styling/index.scss';
import 'vue-sonner/style.css';
import formatting from './plugins/formatting';
import FloatingVue from 'floating-vue';
import notificationsStore from './stores/notifications.store';
import { defineCustomElement } from 'vue';
import ProductFavoriteButton from './components/ProductFavoriteButton.ce.vue';

const FavoriteVueElement = defineCustomElement(ProductFavoriteButton);
customElements.define('app-product-favorite-button', FavoriteVueElement);

declare module 'vue' {
    interface ComponentCustomProperties {
        $format(value: string | number | null | undefined): string;
    }
}

addNetworkInterceptors();

const app = createApp(App);

app
    .use(router)
    .use(formatting)
    .use(FloatingVue);

app.mount('#app');


function addNetworkInterceptors() {
    const { fetch: originalFetch } = window;
    const { open: originalXhrOpen, send: originalXhrSend } = XMLHttpRequest.prototype;

    window.fetch = async(...args) => {
        const [resource, options] = args;

        try {
            const response = await originalFetch(resource, options);

            if (response.status !== 200) {
                let text = 'Could not perform action against Relewise, due to missing permissions on the API Key.';

                if (response.status === 400) {
                    text = 'The App does not support the expected scenario. Contact Relewise for help.';
                }

                if (response.status === 500) {
                    text = 'There was an unexpected error on your dataset. Contact Relewise for help.';
                }

                notificationsStore.push({ type: 'error', title: `An error occurred (${response.status.toString()})`, text: text });
            }

            return response;
        } catch (error) {
            notifyNetworkError(typeof resource === 'string' ? resource : resource instanceof URL ? resource.toString() : undefined);
            throw error;
        }
    };

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
        Reflect.set(this, '__requestUrl', typeof url === 'string' ? url : url.toString());
        return originalXhrOpen.call(this, method, url, async ?? true, username ?? undefined, password ?? undefined);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        this.addEventListener('error', () => {
            notifyNetworkError(Reflect.get(this, '__requestUrl'));
        }, { once: true });

        this.addEventListener('timeout', () => {
            notifyNetworkError(Reflect.get(this, '__requestUrl'));
        }, { once: true });

        return originalXhrSend.call(this, body);
    };
}

function notifyNetworkError(resource?: string) {
    const requestTarget = extractRequestTarget(resource);
    notificationsStore.push({
        type: 'error',
        title: 'Network error',
        text: requestTarget
            ? `A request to ${requestTarget} failed before the app received a response. This is often caused by CORS, DNS, or connectivity issues.`
            : 'A request failed before the app received a response. This is often caused by CORS, DNS, or connectivity issues.',
    });
}

function extractRequestTarget(resource?: string) {
    if (!resource) {
        return null;
    }

    try {
        const url = new URL(resource, window.location.origin);
        return url.origin;
    } catch {
        return resource;
    }
}
