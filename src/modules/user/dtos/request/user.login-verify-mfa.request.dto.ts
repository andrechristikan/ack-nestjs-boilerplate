import {
    UserBackupCodeRegex,
    UserDigitsRegex,
} from '@modules/user/constants/user.constant';
import { z } from 'zod';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaPasskeyAuthenticationResponseSchema } from '@modules/mfa/validations/mfa.passkey-authentication-response.validation';

/** @public */
export const UserLoginVerifyMfaRequestSchema = z.strictObject({
    challengeToken: z.string().min(1).max(128).meta({
        description:
            'Challenge token returned by the login endpoint when MFA is required, at most 128 characters',
        example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    }),
    method: z.enum(EnumMfaMethod).meta({
        description: 'Multi-factor authentication method',
        example: EnumMfaMethod.totp,
    }),
    code: z
        .string()
        .min(1)
        .max(32)
        .regex(UserDigitsRegex, {
            error: () => 'mfa.error.codeRequired',
        })
        .optional()
        .meta({
            description: `digit code from authenticator app. required if method is "${EnumMfaMethod.totp}", at most 32 characters`,
            example: '654321',
        }),
    backupCode: z
        .string()
        .min(1)
        .max(32)
        .regex(UserBackupCodeRegex, {
            error: () => 'mfa.error.codeRequired',
        })
        .optional()
        .meta({
            description:
                'One-time backup code (will be consumed on success), at most 32 characters',
            example: 'ABCD1234EF',
        }),
    passkeyResponse: MfaPasskeyAuthenticationResponseSchema.optional().meta({
        description: `Assertion the browser returned for the passkey options of the login answer. required if method is "${EnumMfaMethod.passkey}"`,
    }),
});

/** @public */
export type UserLoginVerifyMfaRequestDto = z.infer<
    typeof UserLoginVerifyMfaRequestSchema
>;
