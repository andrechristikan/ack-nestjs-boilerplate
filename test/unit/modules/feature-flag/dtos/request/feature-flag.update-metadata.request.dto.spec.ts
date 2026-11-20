import { buildMetadataWithKeyCount } from '@test/unit/helpers/test.unit.feature-flag.helper';
import { FeatureFlagUpdateMetadataRequestSchema } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';

describe('FeatureFlagUpdateMetadataRequestSchema', () => {
    it('parses a metadata object with string, number, boolean, and homogeneous array values', () => {
        const metadata = {
            newFeature: true,
            maxRetries: 3,
            apiEndpoint: 'https://api.example.com',
            allowedRegions: ['sg', 'id'],
            rolloutWeights: [10, 20, 70],
        };

        const result = FeatureFlagUpdateMetadataRequestSchema.parse({
            metadata,
        });

        expect(result).toEqual({ metadata });
    });

    it('rejects a metadata key failing the camelCase pattern', () => {
        const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
            metadata: { NotCamel: true },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata', 'NotCamel'],
                code: 'invalid_key',
            }),
        ]);
    });

    it('rejects a boolean array value', () => {
        const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
            metadata: { flags: [true, false] },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata', 'flags'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects an empty string value', () => {
        const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
            metadata: { label: '' },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata', 'label'],
                code: 'too_small',
                message: 'featureFlag.error.invalidMetadata',
            }),
        ]);
    });

    it('rejects an empty array value', () => {
        const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
            metadata: { tags: [] },
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['metadata', 'tags'],
                code: 'invalid_union',
                message: 'featureFlag.error.invalidMetadata',
            }),
        ]);
    });

    it('rejects an undeclared top-level key', () => {
        const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
            metadata: {},
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    describe('upper bounds', () => {
        it.each([
            [
                'key',
                { ['a'.repeat(64)]: true },
                { ['a'.repeat(65)]: true },
                ['metadata', 'a'.repeat(65)],
                'invalid_key',
            ],
            [
                'string value',
                { label: 'a'.repeat(500) },
                { label: 'a'.repeat(501) },
                ['metadata', 'label'],
                'too_big',
            ],
            [
                'string array item',
                { tags: ['a'.repeat(500)] },
                { tags: ['a'.repeat(501)] },
                ['metadata', 'tags', 0],
                'too_big',
            ],
            [
                'string array length',
                { tags: new Array(100).fill('a') },
                { tags: new Array(101).fill('a') },
                ['metadata', 'tags'],
                'too_big',
            ],
            [
                'number array length',
                { weights: new Array(100).fill(1) },
                { weights: new Array(101).fill(1) },
                ['metadata', 'weights'],
                'too_big',
            ],
            [
                'key count',
                buildMetadataWithKeyCount(50),
                buildMetadataWithKeyCount(51),
                ['metadata'],
                'custom',
            ],
        ])(
            'bounds the %s at its limit',
            (_name, atLimit, pastLimit, path, code) => {
                expect(
                    FeatureFlagUpdateMetadataRequestSchema.safeParse({
                        metadata: atLimit,
                    }).success
                ).toBe(true);

                const result = FeatureFlagUpdateMetadataRequestSchema.safeParse(
                    {
                        metadata: pastLimit,
                    }
                );

                expect(result.error?.issues).toEqual([
                    expect.objectContaining({
                        path,
                        code,
                        message: 'featureFlag.error.invalidMetadata',
                    }),
                ]);
            }
        );
    });

    describe.each([
        ['maxWorkspacesPerUser', 1, 100, 10],
        ['passkeyMaxPerUser', 1, 20, 10],
        ['inviteExpiresInDays', 1, 30, 7],
        ['joinRequestExpiresInDays', 1, 30, 7],
        ['passwordMaxAttempts', 3, 10, 5],
        ['mfaMaxAttempts', 3, 10, 5],
        ['passwordLockDurationInMinutes', 5, 1440, 15],
        ['mfaLockDurationInMinutes', 5, 1440, 15],
    ])('numeric key %s', (key, min, max, seed) => {
        it('parses both bounds and the seed value', () => {
            for (const value of [min, max, seed]) {
                expect(
                    FeatureFlagUpdateMetadataRequestSchema.parse({
                        metadata: { [key]: value },
                    })
                ).toEqual({ metadata: { [key]: value } });
            }
        });

        it('refuses a value below, a value above, and a fraction with featureFlag.error.invalidMetadata', () => {
            for (const value of [min - 1, max + 1, min + 0.5]) {
                const result = FeatureFlagUpdateMetadataRequestSchema.safeParse(
                    { metadata: { [key]: value } }
                );

                expect(result.error?.issues).toEqual([
                    expect.objectContaining({
                        path: ['metadata', key],
                        code: 'custom',
                        message: 'featureFlag.error.invalidMetadata',
                    }),
                ]);
            }
        });
    });

    it('leaves a boolean key and an unknown numeric key unbounded', () => {
        const metadata = { totpAllowed: false, someOtherCount: 0 };

        expect(
            FeatureFlagUpdateMetadataRequestSchema.parse({ metadata })
        ).toEqual({ metadata });
    });
});
