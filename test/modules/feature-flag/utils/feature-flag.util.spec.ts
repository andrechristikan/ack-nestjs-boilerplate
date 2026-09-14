import { describe, expect, it } from 'vitest';

import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';

describe('FeatureFlagUtil', () => {
    const util = new FeatureFlagUtil();

    it('accepts metadata with the same keys and value types', () => {
        expect(
            util.checkMetadataKey(
                { plan: 'pro', seats: 5, enabled: true, tags: ['a'] },
                { tags: ['b'], enabled: false, seats: 10, plan: 'team' }
            )
        ).toBe(true);
    });

    it.each([
        [{ plan: 'pro' }, { plan: 1 }],
        [{ plan: 'pro' }, { plan: '' }],
        [{ tags: ['a'] }, { tags: [] }],
        [{ plan: 'pro' }, { other: 'pro' }],
    ])('rejects incompatible metadata', (oldMetadata, newMetadata) => {
        expect(util.checkMetadataKey(oldMetadata, newMetadata)).toBe(false);
    });
});
