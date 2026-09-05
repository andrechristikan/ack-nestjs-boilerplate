import { z } from 'zod';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';

export const UserLoginVerifyTwoFactorRequestSchema = z.strictObject({
    challengeToken: z.string().min(1).meta({
        description:
            'Challenge token returned by the login endpoint when 2FA is required',
        example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    }),
    method: z.enum(EnumAuthTwoFactorMethod).meta({
        description: 'Two-factor authentication method',
        example: EnumAuthTwoFactorMethod.code,
    }),
    code: z
        .string()
        .min(1)
        .regex(/^[0-9]+$/, {
            error: () => 'auth.error.twoFactorCodeRequired',
        })
        .optional()
        .meta({
            description: `digit code from authenticator app. required if method is "${EnumAuthTwoFactorMethod.code}"`,
            example: '654321',
        }),
    backupCode: z
        .string()
        .min(1)
        .regex(/^[A-Z0-9]+$/, {
            error: () => 'auth.error.twoFactorCodeRequired',
        })
        .optional()
        .meta({
            description: 'One-time backup code (will be consumed on success)',
            example: 'ABCD1234EF',
        }),
});

export type UserLoginVerifyTwoFactorRequestDto = z.infer<
    typeof UserLoginVerifyTwoFactorRequestSchema
>;
