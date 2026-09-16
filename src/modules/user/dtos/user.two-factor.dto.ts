import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Nested two-factor state stored against a user; the secret material never leaves the server.
 */
export const UserTwoFactorSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'Identifier of the user who owns this two-factor record',
        example: faker.database.mongodbObjectId(),
    }),
    enabled: z.boolean().meta({
        description: 'Whether the user has 2FA enabled',
        example: false,
    }),
    requiredSetup: z.boolean().meta({
        description: 'Whether the user is required to set up 2FA',
        example: false,
    }),
    confirmedAt: z.date().nullable().meta({
        description: 'When two-factor authentication was confirmed',
        example: faker.date.past(),
    }),
});

export type UserTwoFactorDto = z.infer<typeof UserTwoFactorSchema>;
