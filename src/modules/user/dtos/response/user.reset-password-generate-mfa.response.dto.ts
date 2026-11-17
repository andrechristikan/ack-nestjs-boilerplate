import { z } from 'zod';
import { UserLoginMfaResponseSchema } from '@modules/user/dtos/response/user.login-mfa.response.dto';

/** @public */
export const UserResetPasswordGenerateMfaResponseSchema = z.object({
    methods: UserLoginMfaResponseSchema.shape.methods.meta({
        description:
            'Methods the user can prove the reset with; empty when the user has no MFA',
    }),
    challengeToken: z.string().nullable().meta({
        description:
            'Challenge token to send back as passkeyChallengeToken with the assertion; null when the user owns no passkey',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    }),
    expiresInMs: z.number().nullable().meta({
        description:
            'Challenge token TTL in milliseconds; null when the user owns no passkey',
        example: 300000,
    }),
    passkeyOptions: UserLoginMfaResponseSchema.shape.passkeyOptions,
});

/** @public */
export type UserResetPasswordGenerateMfaResponseDto = z.infer<
    typeof UserResetPasswordGenerateMfaResponseSchema
>;
