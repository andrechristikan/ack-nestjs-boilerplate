import { z } from 'zod';
import { faker } from '@faker-js/faker';

export const FeatureFlagUpdateStatusRequestSchema = z.strictObject({
    isEnable: z.boolean().meta({
        description: 'Status of the feature flag',
        example: true,
    }),
    rolloutPercent: z.number().int().min(0).max(100).meta({
        description: 'Feature flag rollout percentage (0-100)',
        example: 50,
    }),
    targetUserIds: z
        .array(z.string().regex(/^[0-9a-fA-F]{24}$/))
        .optional()
        .meta({
            description:
                'Target user ids allow-list; omit to keep, [] to clear',
            example: [faker.database.mongodbObjectId()],
        }),
});

export type FeatureFlagUpdateStatusRequestDto = z.infer<
    typeof FeatureFlagUpdateStatusRequestSchema
>;
