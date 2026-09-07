import { z } from 'zod';
import { UserSchema } from '@modules/user/dtos/user.dto';

/**
 * User row as it appears in an admin list, without credential, sign-up and last-login detail.
 */
export const UserListResponseSchema = UserSchema.omit({
    passwordExpired: true,
    passwordCreated: true,
    passwordAttempt: true,
    signUpAt: true,
    signUpFrom: true,
    signUpWith: true,
    gender: true,
    lastLoginAt: true,
    lastIPAddress: true,
    lastLoginFrom: true,
    lastLoginWith: true,
    twoFactor: true,
});

export type UserListResponseDto = z.infer<typeof UserListResponseSchema>;
