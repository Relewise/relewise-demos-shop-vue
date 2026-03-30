import contextStore from '@/stores/context.store';

export default {
    install: (app: any) => {
        app.config.globalProperties.$format = (value: string | number | null | undefined) => {
            if (!value) {
                return '';
            }

            try {
                return new Intl.NumberFormat(
                    contextStore.language.value,
                    {
                        style: 'currency',
                        currency: contextStore.currencyCode.value,
                    })
                    .format(Number(value));
            }
            catch {
                console.warn(`Could not format price using the currency: '${contextStore.currencyCode.value}'`);
                return value;
            }
        };
    },
};
