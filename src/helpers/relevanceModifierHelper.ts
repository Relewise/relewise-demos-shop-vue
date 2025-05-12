import router from '@/router';
import { type RelevanceModifierBuilder, type ConditionBuilder, DataValueFactory, ValueSelectorFactory } from '@relewise/client';

const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

function getValueOfFirstUtmKey(): string | undefined {
    const query = { ...router.currentRoute.value.query };

    for (const key of utmKeys) {
        const value = query[key];

        if (value && !Array.isArray(value)) {
            return value;
        }
    }
}

export function addRelevanceModifiers(relevancemodifierBuilder: RelevanceModifierBuilder) {
    const utmValue = getValueOfFirstUtmKey();

    if (!utmValue) return;

    // Should we boost promoted?
    if (utmValue === 'promoted') {
        relevancemodifierBuilder.addProductDataRelevanceModifier(
            'Promoted',
            (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string('true')),
            ValueSelectorFactory.fixedDoubleValueSelector(1.5),
        );

        return;
    }

    // Boost campaigns
    relevancemodifierBuilder.addProductDataRelevanceModifier(
        'campaignIds',
        (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(utmValue)),
        ValueSelectorFactory.fixedDoubleValueSelector(1.5),
    );
}