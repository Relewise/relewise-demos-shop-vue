import { describe, expect, it } from 'vitest';
import { withContextValues } from '@/helpers/requestContext';

describe('withContextValues', () => {
    it('adds context values without changing the original request', () => {
        const request = { term: undefined, take: 40 };

        const contextualRequest = withContextValues(request, { CampaignID: 'summer-sale' });

        expect(contextualRequest).toEqual({
            term: undefined,
            take: 40,
            contextValues: { CampaignID: 'summer-sale' },
        });
        expect(request).not.toHaveProperty('contextValues');
    });
});
