import { z } from 'zod';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';

/** @public */
export const UserLoginMfaResponseSchema = z.object({
    challengeToken: z.string().meta({
        description: 'Challenge token to be used for completing the MFA login',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    }),
    expiresInMs: z.number().meta({
        description: 'Challenge token TTL in milliseconds',
        example: 300000,
    }),
    methods: z.array(z.enum(EnumMfaMethod)).meta({
        description: 'Methods the user can finish the login with',
        example: [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
    }),
    passkeyOptions: z
        .object({
            challenge: z.string().meta({
                description: 'Base64url challenge the authenticator signs',
                example: 'challengeQuartz',
            }),
            timeout: z.number().exactOptional(),
            rpId: z.string().exactOptional(),
            allowCredentials: z
                .array(
                    z.object({
                        id: z.string(),
                        type: z.string(),
                        transports: z.array(z.string()).exactOptional(),
                    })
                )
                .exactOptional(),
            userVerification: z.string().exactOptional(),
            hints: z.array(z.string()).exactOptional(),
        })
        .nullable()
        .meta({
            description:
                'Options to pass to navigator.credentials.get as JSON; null when the user owns no passkey',
        }),
});

/** @public */
export type UserLoginMfaResponseDto = z.infer<
    typeof UserLoginMfaResponseSchema
>;
