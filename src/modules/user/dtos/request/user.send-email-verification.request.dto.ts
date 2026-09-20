import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

/**
 * Validates the body for resending a verification email.
 * @public
 */
export const UserSendEmailVerificationRequestSchema =
    UserLoginRequestSchema.pick({
        email: true,
    });

/**
 * Body for resending a verification email.
 * @public
 */
export type UserSendEmailVerificationRequestDto = z.infer<
    typeof UserSendEmailVerificationRequestSchema
>;
