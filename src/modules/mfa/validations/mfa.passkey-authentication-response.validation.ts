import { z } from 'zod';

/** @public */
export const MfaPasskeyAuthenticationResponseSchema = z.strictObject({
    id: z
        .string()
        .min(1)
        .max(1364)
        .regex(/^[A-Za-z0-9_-]+$/)
        .meta({
            description:
                'Base64url credential id of the passkey, at most 1364 characters',
            example: 'AbC_-123',
        }),
    rawId: z
        .string()
        .min(1)
        .max(1364)
        .regex(/^[A-Za-z0-9_-]+$/)
        .meta({
            description:
                'Base64url raw credential id of the passkey, at most 1364 characters',
            example: 'AbC_-123',
        }),
    response: z
        .strictObject({
            clientDataJSON: z
                .string()
                .min(1)
                .max(4096)
                .regex(/^[A-Za-z0-9_-]+$/)
                .meta({
                    description:
                        'Base64url client data of the authentication ceremony, at most 4096 characters',
                    example: 'clientDataQuartz',
                }),
            authenticatorData: z
                .string()
                .min(1)
                .max(1024)
                .regex(/^[A-Za-z0-9_-]+$/)
                .meta({
                    description:
                        'Base64url authenticator data, at most 1024 characters',
                    example: 'authenticatorDataQuartz',
                }),
            signature: z
                .string()
                .min(1)
                .max(1024)
                .regex(/^[A-Za-z0-9_-]+$/)
                .meta({
                    description:
                        'Base64url signature of the authenticator, at most 1024 characters',
                    example: 'signatureQuartz',
                }),
            userHandle: z
                .string()
                .min(1)
                .max(86)
                .regex(/^[A-Za-z0-9_-]+$/)
                .meta({
                    description:
                        'Base64url user handle of the credential, at most 86 characters',
                    example: 'userHandleQuartz',
                })
                .exactOptional(),
        })
        .meta({ description: 'Assertion response of the authenticator' }),
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
