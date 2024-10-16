import contextStore from '@/stores/context.store';

export default {
    install: (app: any) => {
        app.config.globalProperties.$format = (value: string | number | null | undefined) => {
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
                    .format(Number(value));
            }
            catch {
                console.warn(`Could not format price using the currency: '${contextStore.context.value.currencyCode}'`);
                return value;
            }
        };
    },
};