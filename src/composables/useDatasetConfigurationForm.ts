import { datasetFeatureFields } from '@/helpers/datasetFeatures';
import { cloneDatasetConfiguration, createDatasetSnapshot, normalizeDatasetConfiguration, uniqueNormalizedStrings } from '@/helpers/datasetConfiguration';
import { validateDatasetCoreFields } from '@/helpers/datasetValidation';
import { validatePersonalization } from '@/helpers/personalizationValidation';
import { useStickyPinned } from '@/composables/useStickyPinned';
import contextStore, { type IDataset } from '@/stores/context.store';
import notificationsStore from '@/stores/notifications.store';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export function useDatasetConfigurationForm(sourceDataset: MaybeRefOrGetter<IDataset>) {
    const editableDataset = ref<IDataset>(cloneDatasetConfiguration(toValue(sourceDataset)));
    const trackingEnabled = ref(toValue(sourceDataset).trackingEnabled ?? false);
    const errors = ref<string[]>([]);
    const saveBarElement = ref<HTMLElement | null>(null);
    const openSections = ref({
        general: true,
        features: false,
        personalization: true,
    });
    const lastSavedSnapshot = ref('');
    const { isPinned: isSaveBarPinned } = useStickyPinned(saveBarElement, 12);

    const enabledFeatureCount = computed(() => {
        return datasetFeatureFields.filter((feature) => editableDataset.value[feature.key]).length;
    });
    const languageItems = computed(() => uniqueNormalizedStrings(editableDataset.value.allLanguages ?? []));
    const currencyItems = computed(() => uniqueNormalizedStrings(editableDataset.value.allCurrencies ?? [], { uppercase: true }));
    const isDirty = computed(() => {
        return createDatasetSnapshot(editableDataset.value, trackingEnabled.value) !== lastSavedSnapshot.value;
    });

    watch(
        () => toValue(sourceDataset),
        (nextDataset) => {
            editableDataset.value = cloneDatasetConfiguration(nextDataset);
            trackingEnabled.value = nextDataset.trackingEnabled ?? false;
            errors.value = [];
            lastSavedSnapshot.value = createDatasetSnapshot(nextDataset, trackingEnabled.value);
        },
        { immediate: true, deep: true },
    );

    function toggleSection(section: keyof typeof openSections.value) {
        openSections.value[section] = !openSections.value[section];
    }

    function setLanguages(nextLanguages: string[]) {
        editableDataset.value.allLanguages = uniqueNormalizedStrings(nextLanguages);
    }

    function setCurrencies(nextCurrencies: string[]) {
        editableDataset.value.allCurrencies = uniqueNormalizedStrings(nextCurrencies, { uppercase: true });
    }

    function saveChanges() {
        errors.value = [];

        const normalizedDataset = normalizeDatasetConfiguration(editableDataset.value);

        errors.value.push(...validateDatasetCoreFields(normalizedDataset));

        if (normalizedDataset.allLanguages.length === 0) {
            errors.value.push('At least one language is required.');
        }
        if (normalizedDataset.allCurrencies.length === 0) {
            errors.value.push('At least one currency is required.');
        }

        const originalDataset = toValue(sourceDataset);
        const duplicateDatasetIds = contextStore.datasets.value.filter((entry) => entry.datasetId === normalizedDataset.datasetId && entry !== originalDataset);
        if (duplicateDatasetIds.length > 0) {
            errors.value.push('Dataset ID must be unique.');
        }

        errors.value.push(...validatePersonalization(normalizedDataset));

        if (errors.value.length > 0) {
            return;
        }

        Object.assign(originalDataset, normalizedDataset, { trackingEnabled: trackingEnabled.value });
        editableDataset.value = cloneDatasetConfiguration(originalDataset);

        if (contextStore.hasActiveDataset.value && contextStore.context.value === originalDataset) {
            contextStore.refreshActiveContext();
        }
        else {
            contextStore.persistState();
        }

        lastSavedSnapshot.value = createDatasetSnapshot(originalDataset, trackingEnabled.value);
        notificationsStore.push({ type: 'success', title: 'Settings saved', text: 'Dataset settings were saved.' });
    }

    return {
        editableDataset,
        trackingEnabled,
        errors,
        saveBarElement,
        isSaveBarPinned,
        openSections,
        enabledFeatureCount,
        languageItems,
        currencyItems,
        isDirty,
        featureFields: datasetFeatureFields,
        toggleSection,
        setLanguages,
        setCurrencies,
        saveChanges,
    };
}
