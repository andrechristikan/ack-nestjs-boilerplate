import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { MfaPasskeyAuthenticationResponseSchema } from '@modules/mfa/validations/mfa.passkey-authentication-response.validation';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserChangePasswordRequestSchema } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserLoginVerifyMfaRequestSchema } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';

/** @public */
export const UserForgotPasswordResetRequestSchema =
    UserChangePasswordRequestSchema.pick({ newPassword: true }).extend({
        method: UserLoginVerifyMfaRequestSchema.shape.method.optional(),
        code: UserLoginVerifyMfaRequestSchema.shape.code,
        backupCode: UserLoginVerifyMfaRequestSchema.shape.backupCode,
        passkeyChallengeToken: z
            .string()
            .min(1)
            .max(128)
            .optional()
            .meta({
                description: `Challenge token returned by the reset MFA generate endpoint. required if method is "${EnumMfaMethod.passkey}", at most 128 characters`,
                example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            }),
        passkeyResponse: MfaPasskeyAuthenticationResponseSchema.optional().meta(
            {
                description: `Assertion the browser returned for the passkey options of the reset MFA generate answer. required if method is "${EnumMfaMethod.passkey}"`,
            }
        ),
        token: z
            .string()
            .min(1)
            .max(200)
            .meta({
                description: 'Forgot password token, at most 200 characters',
                example: faker.string.alphanumeric(20),
            }),
    });

/** @public */
export type UserForgotPasswordResetRequestDto = z.infer<
    typeof UserForgotPasswordResetRequestSchema
>;
