import { z } from 'zod';
import { faker } from '@faker-js/faker';

export const FeatureFlagTargetUserRequestSchema = z.strictObject({
    userId: z.uuid().meta({
        description: 'Target user identifier',
        example: faker.string.uuid(),
    }),
});

export type FeatureFlagTargetUserRequestDto = z.infer<
    typeof FeatureFlagTargetUserRequestSchema
>;
