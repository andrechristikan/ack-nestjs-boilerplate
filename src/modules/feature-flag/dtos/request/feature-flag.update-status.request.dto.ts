import { z } from 'zod';

/**
 * Validates the body for toggling a feature flag and its rollout.
 * @public
 */
export const FeatureFlagUpdateStatusRequestSchema = z.strictObject({
    isEnable: z.boolean().meta({
        description: 'Status of the feature flag',
        example: true,
    }),
    rolloutPercent: z.number().int().min(0).max(100).meta({
        description: 'Feature flag rollout percentage (0-100)',
        example: 50,
    }),
});

/**
 * Body for toggling a feature flag and its rollout.
 * @public
 */
export type FeatureFlagUpdateStatusRequestDto = z.infer<
    typeof FeatureFlagUpdateStatusRequestSchema
>;
