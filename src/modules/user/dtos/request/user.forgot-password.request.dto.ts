import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

/** @public */
export const UserForgotPasswordRequestSchema = UserLoginRequestSchema.pick({
    email: true,
});

/** @public */
export type UserForgotPasswordRequestDto = z.infer<
    typeof UserForgotPasswordRequestSchema
>;
