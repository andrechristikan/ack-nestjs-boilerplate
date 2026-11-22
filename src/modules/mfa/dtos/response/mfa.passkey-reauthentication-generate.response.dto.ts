import { z } from 'zod';
import { UserLoginPasskeyGenerateResponseSchema } from '@modules/user/dtos/response/user.login-passkey-generate.response.dto';

/** @public */
export const MfaPasskeyReauthenticationGenerateResponseSchema = z.object({
    challengeToken: z.string().meta({
        description:
            'Challenge token to send back as passkeyChallengeToken with the assertion',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    }),
    expiresInMs: z.number().meta({
        description: 'Challenge token TTL in milliseconds',
        example: 300000,
    }),
    passkeyOptions:
        UserLoginPasskeyGenerateResponseSchema.shape.passkeyOptions.meta({
            description:
                'Options to pass to navigator.credentials.get as JSON; allowCredentials lists the passkeys of the caller',
        }),
});

/** @public */
export type MfaPasskeyReauthenticationGenerateResponseDto = z.infer<
    typeof MfaPasskeyReauthenticationGenerateResponseSchema
>;
