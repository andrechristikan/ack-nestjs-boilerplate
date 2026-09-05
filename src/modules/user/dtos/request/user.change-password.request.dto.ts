import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestPasswordStrengthRegex } from '@common/request/constants/request.constant';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

export const UserChangePasswordRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true })
        .partial()
        .extend({
            newPassword: z
                .string()
                .min(8)
                .max(50)
                .regex(RequestPasswordStrengthRegex, {
                    error: () => 'request.error.isPassword.strong',
                })
                .meta({
                    description:
                        "new string password, newPassword can't same with oldPassword",
                    example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
                        .alphanumeric(5)
                        .toUpperCase()}@@!123`,
                }),
            oldPassword: z
                .string()
                .min(1)
                .meta({
                    description: 'old string password',
                    example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
                        .alphanumeric(5)
                        .toUpperCase()}@@!123`,
                }),
        });

export type UserChangePasswordRequestDto = z.infer<
    typeof UserChangePasswordRequestSchema
>;
