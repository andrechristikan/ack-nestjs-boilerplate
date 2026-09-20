import { z } from 'zod';
import { UserCheckEmailResponseSchema } from '@modules/user/dtos/response/user.check-email.response.dto';

/**
 * Shapes a username check outcome, adding the pattern check.
 * @public
 */
export const UserCheckUsernameResponseSchema =
    UserCheckEmailResponseSchema.extend({
        pattern: z.boolean().meta({
            description: 'Whether the username matches the allowed pattern',
            example: true,
        }),
    });

/**
 * Username check outcome.
 * @public
 */
export type UserCheckUsernameResponseDto = z.infer<
    typeof UserCheckUsernameResponseSchema
>;
