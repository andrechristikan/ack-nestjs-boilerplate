import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one user sitting close to the password attempt lockout threshold.
 * @public
 */
export const AnalyticNearLockoutResponseSchema = z.object({
    id: z.string().meta({
        description: 'Identifier of the user near lockout',
        example: faker.database.mongodbObjectId(),
    }),
    email: z.string().meta({
        description: 'Email address of the user near lockout',
        example: faker.internet.email(),
    }),
    passwordAttempt: z
        .number()
        .nullable()
        .meta({
            description: 'Failed password attempts recorded for the user',
            example: faker.number.int({ min: 0, max: 5 }),
        }),
    lastLoginAt: z.date().nullable().meta({
        description: 'When the user last logged in',
        example: faker.date.recent(),
    }),
    createdAt: z.date().meta({
        description: 'When the user was created',
        example: faker.date.past(),
    }),
});

/**
 * One user sitting close to the password attempt lockout threshold.
 * @public
 */
export type AnalyticNearLockoutResponseDto = z.infer<
    typeof AnalyticNearLockoutResponseSchema
>;
