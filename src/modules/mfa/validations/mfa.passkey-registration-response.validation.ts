import { MfaPasskeyBase64UrlRegex } from '@modules/mfa/constants/mfa.constant';
import { z } from 'zod';

/** @public */
export const MfaPasskeyRegistrationResponseSchema = z.strictObject({
    id: z.string().min(1).max(1364).regex(MfaPasskeyBase64UrlRegex).meta({
        description:
            'Base64url credential id of the new passkey, at most 1364 characters',
        example: 'AbC_-123',
    }),
    rawId: z.string().min(1).max(1364).regex(MfaPasskeyBase64UrlRegex).meta({
        description:
            'Base64url raw credential id of the new passkey, at most 1364 characters',
        example: 'AbC_-123',
    }),
    response: z
        .strictObject({
            clientDataJSON: z
                .string()
                .min(1)
                .max(4096)
                .regex(MfaPasskeyBase64UrlRegex)
                .meta({
                    description:
                        'Base64url client data of the registration ceremony, at most 4096 characters',
                    example: 'clientDataQuartz',
                }),
            attestationObject: z
                .string()
                .min(1)
                .max(16384)
                .regex(MfaPasskeyBase64UrlRegex)
                .meta({
                    description:
                        'Base64url attestation object of the authenticator, at most 16384 characters',
                    example: 'attestationQuartz',
                }),
            authenticatorData: z
                .string()
                .min(1)
                .max(4096)
                .regex(MfaPasskeyBase64UrlRegex)
                .meta({
                    description:
                        'Base64url authenticator data, at most 4096 characters',
                    example: 'authenticatorDataQuartz',
                })
                .exactOptional(),
            publicKey: z
                .string()
                .min(1)
                .max(2048)
                .regex(MfaPasskeyBase64UrlRegex)
                .meta({
                    description:
                        'Base64url public key of the credential, at most 2048 characters',
                    example: 'MFkwEwYHKoZIzj0CAQ',
                })
                .exactOptional(),
            publicKeyAlgorithm: z
                .number()
                .int()
                .meta({
                    description: 'COSE algorithm identifier of the public key',
                    example: -7,
                })
                .exactOptional(),
            transports: z
                .array(
                    z.enum([
                        'ble',
                        'cable',
                        'hybrid',
                        'internal',
                        'nfc',
                        'smart-card',
                        'usb',
                    ])
                )
                .max(7)
                .meta({
                    description:
                        'Transports the authenticator reports, at most 7',
                    example: ['internal', 'hybrid'],
                })
                .exactOptional(),
        })
        .meta({ description: 'Attestation response of the authenticator' }),
    authenticatorAttachment: z
        .enum(['platform', 'cross-platform'])
        .meta({
            description: 'Attachment of the authenticator',
            example: 'platform',
        })
        .exactOptional(),
    type: z.literal('public-key').meta({
        description: 'Credential type',
        example: 'public-key',
    }),
    clientExtensionResults: z.object({}).meta({
        description:
            'Client extension results; every key is dropped, none is read',
        example: {},
    }),
});
