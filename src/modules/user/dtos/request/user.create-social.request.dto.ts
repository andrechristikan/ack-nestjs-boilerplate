import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestSchema } from '@modules/user/dtos/request/user.sign-up.request.dto';

export const UserCreateSocialRequestSchema = UserSignUpRequestSchema.omit({
    email: true,
    from: true,
    password: true,
}).extend(UserLoginRequestSchema.pick({ from: true, device: true }).shape);

export type UserCreateSocialRequestDto = z.infer<
    typeof UserCreateSocialRequestSchema
>;
