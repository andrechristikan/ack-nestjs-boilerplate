import { ZodError } from 'zod';
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
        expect(() =>
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: { NotCamel: true },
            })
        ).toThrow();
    });

    it('rejects a boolean array value', () => {
        expect(() =>
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: { flags: [true, false] },
            })
        ).toThrow();
    });

    it('rejects an empty string value', () => {
        expect(() =>
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: { label: '' },
            })
        ).toThrow(ZodError);
    });

    it('rejects an empty array value', () => {
        expect(() =>
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: { tags: [] },
            })
        ).toThrow(ZodError);
    });

    it('rejects an undeclared top-level key', () => {
        expect(() =>
            FeatureFlagUpdateMetadataRequestSchema.parse({
                metadata: {},
                extra: true,
            })
        ).toThrow();
    });

    describe('upper bounds', () => {
        it.each([
            ['key', { ['a'.repeat(64)]: true }, { ['a'.repeat(65)]: true }],
            [
                'string value',
                { label: 'a'.repeat(500) },
                { label: 'a'.repeat(501) },
            ],
            [
                'string array item',
                { tags: ['a'.repeat(500)] },
                { tags: ['a'.repeat(501)] },
            ],
            [
                'string array length',
                { tags: new Array(100).fill('a') },
                { tags: new Array(101).fill('a') },
            ],
            [
                'number array length',
                { weights: new Array(100).fill(1) },
                { weights: new Array(101).fill(1) },
            ],
            [
                'key count',
                buildMetadataWithKeyCount(50),
                buildMetadataWithKeyCount(51),
            ],
        ])('bounds the %s at its limit', (_name, atLimit, pastLimit) => {
            expect(
                FeatureFlagUpdateMetadataRequestSchema.safeParse({
                    metadata: atLimit,
                }).success
            ).toBe(true);

            const result = FeatureFlagUpdateMetadataRequestSchema.safeParse({
                metadata: pastLimit,
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues[0]?.message).toBe(
                'featureFlag.error.invalidMetadata'
            );
        });
    });
});
