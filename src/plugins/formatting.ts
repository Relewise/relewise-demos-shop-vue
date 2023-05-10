import contextStore from '@/stores/context.store';
import type Plugin from 'vue';

declare module 'vue' {
    export interface Vue {
        $format(value: number | null): string;
    }
}

export const formatting: Plugin = {
    install: (app) => {
        app.config.globalProperties.$format = (value: number | null) => {
            if (!value) {
                return '';
            }

            try {
                return new Intl.NumberFormat(
                    contextStore.context.value.language,
                    {
                        style: 'currency',
                        currency: contextStore.context.value.currencyCode,
                    })
                    .format(value);
            }
            catch {
                console.warn(`Could not format price using the currency: '${contextStore.context.value.currencyCode}'`);
                return value;
            }
        };
    },
};