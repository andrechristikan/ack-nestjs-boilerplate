import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

export const UserForgotPasswordResetRequestSchema =
    UserChangePasswordRequestSchema.pick({ newPassword: true })
        .extend(
            UserLoginVerifyTwoFactorRequestSchema.omit({
                challengeToken: true,
            }).partial().shape
        )
        .extend({
            token: z
                .string()
                .min(1)
                .meta({
                    description: 'Forgot password token',
                    example: faker.string.alphanumeric(20),
                }),
        });

export type UserForgotPasswordResetRequestDto = z.infer<
    typeof UserForgotPasswordResetRequestSchema
>;
