import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';
import { MfaPasskeyRegistrationResponseSchema } from '@modules/mfa/validations/mfa.passkey-registration-response.validation';

/** @public */
export const MfaPasskeyRegisterRequestSchema =
    UserReauthenticationRequestSchema.extend({
        challengeToken: z.string().min(1).max(128).meta({
            description:
                'Challenge token of the passkey registration options, at most 128 characters',
            example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
        }),
        name: z.string().trim().toLowerCase().min(1).max(50).meta({
            description: 'Name of the passkey, at most 50 characters',
            example: 'iphone',
        }),
        registrationResponse: MfaPasskeyRegistrationResponseSchema.meta({
            description:
                'Attestation the authenticator made for the registration options',
        }),
    });

/** @public */
export type MfaPasskeyRegisterRequestDto = z.infer<
    typeof MfaPasskeyRegisterRequestSchema
>;
