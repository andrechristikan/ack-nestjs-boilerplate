import { z } from 'zod';
import { UserLoginVerifyMfaRequestSchema } from '@modules/user/dtos/request/user.login-verify-mfa.request.dto';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaPasskeyAuthenticationResponseSchema } from '@modules/mfa/validations/mfa.passkey-authentication-response.validation';
import { UserPasswordMaxLength } from '@modules/user/constants/user.constant';

/** @public */
export const UserReauthenticationRequestSchema =
    UserLoginVerifyMfaRequestSchema.pick({
        code: true,
        backupCode: true,
    })
        .partial()
        .extend({
            method: z
                .enum([EnumMfaMethod.totp, EnumMfaMethod.backupCode])
                .meta({
                    description:
                        'MFA method of the re-authentication when no passkey proof is sent',
                    example: EnumMfaMethod.totp,
                })
                .optional(),
            password: z
                .string()
                .min(1)
                .max(UserPasswordMaxLength)
                .meta({
                    description:
                        'current string password, required when the account has one, at most 64 characters',
                    example: 'Current-pass1',
                })
                .optional(),
            passkeyChallengeToken: z
                .string()
                .min(1)
                .max(128)
                .meta({
                    description:
                        'challenge token of the passkey reauthentication options, sent with passkeyResponse as the whole proof, at most 128 characters',
                    example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
                })
                .optional(),
            passkeyResponse: MfaPasskeyAuthenticationResponseSchema.meta({
                description:
                    'assertion the browser returned for the passkey reauthentication options, sent with passkeyChallengeToken as the whole proof',
            }).optional(),
            otp: z
                .string()
                .min(1)
                .max(32)
                .meta({
                    description:
                        'one-time code sent to the account email, for an account with no password and no multi-factor authentication, at most 32 characters',
                    example: '123456',
                })
                .optional(),
        });

/** @public */
export type UserReauthenticationRequestDto = z.infer<
    typeof UserReauthenticationRequestSchema
>;
