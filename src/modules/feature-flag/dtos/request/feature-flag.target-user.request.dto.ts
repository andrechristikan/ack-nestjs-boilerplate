import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

/** @public */
export const FeatureFlagTargetUserRequestSchema = z.strictObject({
    userId: RequestUuidSchema.meta({
        description: 'Target user identifier',
        example: faker.string.uuid(),
    }),
});

/** @public */
export type FeatureFlagTargetUserRequestDto = z.infer<
    typeof FeatureFlagTargetUserRequestSchema
>;
