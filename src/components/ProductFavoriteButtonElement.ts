import { createApp, defineComponent, h, reactive, type App } from 'vue';
import type { ProductResult, User } from '@relewise/client';
import ProductFavoriteButton from '@/components/ProductFavoriteButton.vue';

const TAG_NAME = 'app-product-favorite-button';

export class ProductFavoriteButtonElement extends HTMLElement {
    private app: App<Element> | null = null;
    private readonly state = reactive<{ product?: ProductResult; user?: User }>({});

    connectedCallback() {
        if (this.app) {
            return;
        }

        const element = this;
        const Wrapper = defineComponent({
            name: 'ProductFavoriteButtonHost',
            setup() {
                return () => {
                    if (!element.state.product) {
                        return null;
                    }

                    return h(ProductFavoriteButton, { product: element.state.product, user: element.state.user });
                };
            },
        });

        this.app = createApp(Wrapper);
        this.app.mount(this);
    }

    disconnectedCallback() {
        if (!this.app) {
            return;
        }

        this.app.unmount();
        this.app = null;
    }

    set product(value: ProductResult | undefined) {
        this.state.product = value;
    }

    get product(): ProductResult | undefined {
        return this.state.product;
    }

    set user(value: User | undefined) {
        this.state.user = value;
    }

    get user(): User | undefined {
        return this.state.user;
    }
}

let isRegistered = false;

export const ensureProductFavoriteButtonElement = () => {
    if (isRegistered || typeof window === 'undefined') {
        return;
    }

    if (!customElements.get(TAG_NAME)) {
        customElements.define(TAG_NAME, ProductFavoriteButtonElement);
    }

    isRegistered = true;
};
