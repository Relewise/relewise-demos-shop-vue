import type { ProductResult } from '@relewise/client';
import { computed, reactive } from 'vue';

export interface ILineItem {
    product: ProductResult;
    quantity: number
}

export interface IBasket {
    lineItems: ILineItem[];
}

interface IBasketState {
    model: IBasket;
}

class BasketService {
    private state = reactive<IBasketState>({
        model: { lineItems: [] },
    });

    constructor() {
        const storedBasket = localStorage.getItem('basket');
        if (storedBasket !== null) {
            this.state.model = JSON.parse(storedBasket);
        }
    }

    get model() {
        return computed(() => this.state.model);
    }

    async addProduct({ product, quantityDelta }: {product: ProductResult, quantityDelta: number}) {
        const productIndex = this.state.model.lineItems.findIndex(x => x.product.productId === product.productId);

        if (productIndex > -1) {
            const lineItem = this.state.model.lineItems[productIndex];
            lineItem.quantity = lineItem.quantity + quantityDelta;
            if (lineItem.quantity <= 0) {
                this.state.model.lineItems.splice(productIndex, 1);
            }
        } else {
            this.model.value.lineItems.push({ product: product, quantity: quantityDelta });
        }

        this.basketModified();
    }

    async remove(lineItem: ILineItem) {
        this.state.model.lineItems.splice(this.state.model.lineItems.indexOf(lineItem), 1);
        this.basketModified();
    }

    async clear() {
        this.state.model = { lineItems: [] };
        this.basketModified();
    }

    private basketModified() {
        localStorage.setItem('basket', JSON.stringify(this.model.value));
    }
}

export default new BasketService();
