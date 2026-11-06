import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticForgotPasswordAbuseResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user requesting the tokens',
        example: faker.database.mongodbObjectId(),
    }),
    tokenCount: z.number().meta({
        description: 'Number of forgot password tokens issued in the window',
        example: faker.number.int({ min: 0, max: 100 }),
    }),
});

/** @public */
export type AnalyticForgotPasswordAbuseResponseDto = z.infer<
    typeof AnalyticForgotPasswordAbuseResponseSchema
>;
