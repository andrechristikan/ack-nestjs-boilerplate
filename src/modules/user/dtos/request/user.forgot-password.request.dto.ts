import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

export const UserForgotPasswordRequestSchema = UserLoginRequestSchema.pick({
    email: true,
});

export type UserForgotPasswordRequestDto = z.infer<
    typeof UserForgotPasswordRequestSchema
>;
