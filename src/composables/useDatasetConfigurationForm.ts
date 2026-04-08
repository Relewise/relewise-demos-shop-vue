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
    const lastSavedSnapshot = ref('');
    const currentSnapshot = ref(createDatasetSnapshot(editableDataset.value, trackingEnabled.value));
    const { isPinned: isSaveBarPinned } = useStickyPinned(saveBarElement, 12);
    const openSections = ref(loadOpenSections(toValue(sourceDataset).datasetId));

    const enabledFeatureCount = computed(() => datasetFeatureFields
        .reduce((count, feature) => count + (editableDataset.value[feature.key] ? 1 : 0), 0));
    const languageItems = computed({
        get: () => uniqueNormalizedStrings(editableDataset.value.allLanguages ?? []),
        set: (nextLanguages: string[]) => {
            editableDataset.value.allLanguages = uniqueNormalizedStrings(nextLanguages);
        },
    });
    const currencyItems = computed({
        get: () => uniqueNormalizedStrings(editableDataset.value.allCurrencies ?? [], { uppercase: true }),
        set: (nextCurrencies: string[]) => {
            editableDataset.value.allCurrencies = uniqueNormalizedStrings(nextCurrencies, { uppercase: true });
        },
    });
    const isDirty = computed(() => {
        return currentSnapshot.value !== lastSavedSnapshot.value;
    });

    watch(
        () => toValue(sourceDataset),
        (nextDataset) => {
            editableDataset.value = cloneDatasetConfiguration(nextDataset);
            trackingEnabled.value = nextDataset.trackingEnabled ?? false;
            errors.value = [];
            currentSnapshot.value = createDatasetSnapshot(editableDataset.value, trackingEnabled.value);
            lastSavedSnapshot.value = currentSnapshot.value;
            openSections.value = loadOpenSections(nextDataset.datasetId);
        },
        { immediate: true, deep: true },
    );

    watch(
        [editableDataset, trackingEnabled],
        () => {
            currentSnapshot.value = createDatasetSnapshot(editableDataset.value, trackingEnabled.value);
            if (errors.value.length > 0) {
                errors.value = [];
            }
        },
        { deep: true },
    );

    watch(
        openSections,
        (nextValue) => {
            saveOpenSections(toValue(sourceDataset).datasetId, nextValue);
        },
        { deep: true },
    );

    function toggleSection(section: keyof typeof openSections.value) {
        openSections.value[section] = !openSections.value[section];
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
        currentSnapshot.value = createDatasetSnapshot(editableDataset.value, trackingEnabled.value);

        if (contextStore.hasActiveDataset.value && contextStore.context.value === originalDataset) {
            contextStore.refreshActiveContext();
        }
        else {
            contextStore.persistState();
        }

        lastSavedSnapshot.value = currentSnapshot.value;
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
        saveChanges,
    };
}

function getOpenSectionsStorageKey(datasetId: string | undefined) {
    return `settings-open-sections:${datasetId ?? 'unknown'}`;
}

function loadOpenSections(datasetId: string | undefined) {
    const fallback = {
        general: true,
        features: false,
        personalization: true,
    };

    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const raw = window.sessionStorage.getItem(getOpenSectionsStorageKey(datasetId));
        if (!raw) {
            return fallback;
        }

        const parsed = JSON.parse(raw) as Partial<typeof fallback>;
        return {
            general: parsed.general ?? fallback.general,
            features: parsed.features ?? fallback.features,
            personalization: parsed.personalization ?? fallback.personalization,
        };
    }
    catch {
        return fallback;
    }
}

function saveOpenSections(datasetId: string | undefined, openSections: { general: boolean; features: boolean; personalization: boolean }) {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(getOpenSectionsStorageKey(datasetId), JSON.stringify(openSections));
}
