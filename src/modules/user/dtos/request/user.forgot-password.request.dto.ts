import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

/**
 * Validates the body for requesting a password reset.
 * @public
 */
export const UserForgotPasswordRequestSchema = UserLoginRequestSchema.pick({
    email: true,
});

/**
 * Body for requesting a password reset.
 * @public
 */
export type UserForgotPasswordRequestDto = z.infer<
    typeof UserForgotPasswordRequestSchema
>;
