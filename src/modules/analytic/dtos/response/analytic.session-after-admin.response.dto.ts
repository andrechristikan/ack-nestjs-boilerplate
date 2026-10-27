import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one login that happened after an admin revoked the user's session.
 * @public
 */
export const AnalyticSessionAfterAdminResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user who logged back in',
        example: faker.string.uuid(),
    }),
    revokedAt: z.date().meta({
        description: 'When the admin revoked the session',
        example: faker.date.recent(),
    }),
    loginAt: z.date().meta({
        description: 'When the user logged in after the revoke',
        example: faker.date.recent(),
    }),
});

/**
 * One login that happened after an admin revoked the user's session.
 * @public
 */
export type AnalyticSessionAfterAdminResponseDto = z.infer<
    typeof AnalyticSessionAfterAdminResponseSchema
>;
