import { UserUsernameRegex } from '@modules/user/constants/user.constant';
import { z } from 'zod';

/**
 * Validates the body for claiming a username, lower-cased.
 * @public
 */
export const UserClaimUsernameRequestSchema = z.strictObject({
    username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(UserUsernameRegex)
        .meta({
            description: 'username to claim',
            example: 'john_doe123',
        })
        .transform(value => value as Lowercase<string>),
});

/**
 * Body for claiming a username.
 * @public
 */
export type UserClaimUsernameRequestDto = z.infer<
    typeof UserClaimUsernameRequestSchema
>;
