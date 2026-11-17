import { z } from 'zod';
import { MfaPasskeyAuthenticationResponseSchema } from '@modules/mfa/validations/mfa.passkey-authentication-response.validation';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

/** @public */
export const UserLoginPasskeyRequestSchema = UserLoginRequestSchema.pick({
    from: true,
    device: true,
}).extend({
    challengeToken: z.string().min(1).max(128).meta({
        description:
            'Challenge token returned by the passkey generate endpoint, at most 128 characters',
        example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    }),
    passkeyResponse: MfaPasskeyAuthenticationResponseSchema.meta({
        description:
            'Assertion the browser returned for the passkey options of the generate answer',
    }),
});

/** @public */
export type UserLoginPasskeyRequestDto = z.infer<
    typeof UserLoginPasskeyRequestSchema
>;
