import { describe, expect, it } from 'vitest';

import { FeatureFlagUpdateMetadataRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';

describe('FeatureFlagUpdateMetadataRequestSchema', () => {
    it('accepts flat camelCase metadata with supported homogeneous values', () => {
        expect(
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: {
                    allowSignup: true,
                    plan: 'pro',
                    weights: [10, 20],
                    regions: ['eu', 'us'],
                },
            })
        ).toEqual({
            metadata: {
                allowSignup: true,
                plan: 'pro',
                weights: [10, 20],
                regions: ['eu', 'us'],
            },
        });
    });

    it.each([
        { bad_key: true },
        { nested: { enabled: true } },
        { mixed: [1, 'two'] },
        { booleans: [true, false] },
    ])('rejects unsupported metadata shape %j', metadata => {
        expect(
            FeatureFlagUpdateMetadataRequestSchema.safeParse({ metadata })
                .success
        ).toBe(false);
    });
});
