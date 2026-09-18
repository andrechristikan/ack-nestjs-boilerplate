import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { IFeatureFlagMetadata } from '@modules/feature-flag/interfaces/feature-flag.interface';

/**
 * Base feature-flag shape: the stored feature-flag row.
 */
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
    metadata: z
        .custom<IFeatureFlagMetadata>()
        .meta({
            type: 'object',
            description: 'Feature flag metadata in JSON format',
            example: { newFeature: true },
        })
        .nullable(),
});

export type FeatureFlagResponseDto = z.infer<typeof FeatureFlagResponseSchema>;
