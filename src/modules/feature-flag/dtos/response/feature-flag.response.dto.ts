import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import type { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';

/** @public */
export const FeatureFlagResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    key: z.string().meta({
        description: 'Feature flag key',
        example: 'loginWithGoogle',
    }),
    isEnable: z.boolean().meta({
        description: 'Feature flag status',
        example: true,
    }),
    targetUserIds: z.array(z.string()).meta({
        description: 'Target user ids allow-list that bypasses rollout',
        example: [faker.database.mongodbObjectId()],
    }),
    rolloutPercent: z.number().int().min(0).max(100).meta({
        description: 'Percentage of callers that receive the feature',
        example: 50,
    }),
    description: z.string().meta({
        description: 'Feature flag description',
        example: 'Allows sign-in with Google',
    }),
    metadata: z
        .custom<IFeatureFlagMetadata>()
        .meta({
            type: 'object',
            description: 'Feature flag metadata in JSON format',
            example: { newFeature: true },
        })
        .nullable(),
});

/** @public */
export type FeatureFlagResponseDto = z.infer<typeof FeatureFlagResponseSchema>;
