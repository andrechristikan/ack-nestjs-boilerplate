import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/** @public */
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
        .array(RequestUuidSchema)
        .max(1000)
        .meta({
            description:
                'Target user ids allow-list, at most 1000; [] clears it',
            example: [faker.string.uuid()],
        }),
});

/** @public */
export type FeatureFlagUpdateStatusRequestDto = z.infer<
    typeof FeatureFlagUpdateStatusRequestSchema
>;
