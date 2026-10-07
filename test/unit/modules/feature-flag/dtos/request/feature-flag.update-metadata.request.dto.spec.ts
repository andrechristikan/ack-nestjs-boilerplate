import { ZodError } from 'zod';
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
});
