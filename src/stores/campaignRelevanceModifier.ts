import { ConditionBuilder, DataValueFactory, RelevanceModifierBuilder, ValueSelectorFactory, type DataDoubleSelector, type FixedDoubleValueSelector } from '@relewise/client';
import appContext from './context.store';

export function addCampaignRelevanceModifier(relevancemodifierBuilder: RelevanceModifierBuilder) {
    const utmValue = appContext.utm;

    if (!utmValue) return;

    if (utmValue === 'promoted') {
        relevancemodifierBuilder.addProductDataRelevanceModifier(
            'Promoted',
            (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string("true")),
            ValueSelectorFactory.fixedDoubleValueSelector(1.5)
        );
    } else {
        relevancemodifierBuilder.addProductDataRelevanceModifier(
            'campaignIds',
            (c: ConditionBuilder) => c.addContainsCondition(DataValueFactory.string(utmValue)),
            ValueSelectorFactory.fixedDoubleValueSelector(1.5)
        );
    }
}