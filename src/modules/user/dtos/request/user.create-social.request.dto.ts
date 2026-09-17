import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';

/**
 * Validates the body for signing in with a social account.
 * @public
 */
export const UserCreateSocialRequestSchema = UserSignUpRequestSchema.omit({
    email: true,
    from: true,
    password: true,
}).extend({
    from: UserLoginRequestSchema.shape.from,
    device: UserLoginRequestSchema.shape.device,
});

/**
 * Body for signing in with a social account.
 * @public
 */
export type UserCreateSocialRequestDto = z.infer<
    typeof UserCreateSocialRequestSchema
>;
