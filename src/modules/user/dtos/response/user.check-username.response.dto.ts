import { z } from 'zod';
import { UserCheckEmailResponseSchema } from '@modules/user/dtos/response/user.check-email.response.dto';

/** @public */
export const UserCheckUsernameResponseSchema =
    UserCheckEmailResponseSchema.extend({
        pattern: z.boolean().meta({
            description: 'Whether the username matches the allowed pattern',
            example: true,
        }),
    });

/** @public */
export type UserCheckUsernameResponseDto = z.infer<
    typeof UserCheckUsernameResponseSchema
>;
