import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
export const AnalyticSessionAfterAdminResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user who logged back in',
        example: faker.database.mongodbObjectId(),
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

/** @public */
export type AnalyticSessionAfterAdminResponseDto = z.infer<
    typeof AnalyticSessionAfterAdminResponseSchema
>;
