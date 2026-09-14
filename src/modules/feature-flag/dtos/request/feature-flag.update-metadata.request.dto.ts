import { z } from 'zod';

export const FeatureFlagUpdateMetadataRequestSchema = z.strictObject({
    metadata: z
        .record(
            z.string().regex(/^[a-z][a-zA-Z0-9]*$/, {
                error: () => 'featureFlag.error.invalidMetadata',
            }),
            z.union(
                [
                    z.string(),
                    z.number(),
                    z.boolean(),
                    z.array(z.string()),
                    z.array(z.number()),
                ],
                { error: () => 'featureFlag.error.invalidMetadata' }
            ),
            { error: () => 'featureFlag.error.invalidMetadata' }
        )
        .meta({
            description: 'Feature flag metadata in JSON format',
            example: {
                newFeature: true,
                betaUserAccess: false,
                maxRetries: 3,
                apiEndpoint: 'https://api.example.com',
                allowedRegions: ['sg', 'id'],
                rolloutWeights: [10, 20, 70],
            },
        }),
});

export type FeatureFlagUpdateMetadataRequestDto = z.infer<
    typeof FeatureFlagUpdateMetadataRequestSchema
>;
