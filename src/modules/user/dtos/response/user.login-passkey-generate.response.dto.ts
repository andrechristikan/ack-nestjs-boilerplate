import { z } from 'zod';
import { UserLoginMfaResponseSchema } from '@modules/user/dtos/response/user.login-mfa.response.dto';

/** @public */
export const UserLoginPasskeyGenerateResponseSchema = z.object({
    challengeToken: z.string().meta({
        description: 'Challenge token to send back with the passkey login',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    }),
    expiresInMs: z.number().meta({
        description: 'Challenge token TTL in milliseconds',
        example: 300000,
    }),
    passkeyOptions: UserLoginMfaResponseSchema.shape.passkeyOptions
        .unwrap()
        .meta({
            description:
                'Options to pass to navigator.credentials.get as JSON; allowCredentials is empty so the authenticator offers its discoverable passkeys',
        }),
});

/** @public */
export type UserLoginPasskeyGenerateResponseDto = z.infer<
    typeof UserLoginPasskeyGenerateResponseSchema
>;
