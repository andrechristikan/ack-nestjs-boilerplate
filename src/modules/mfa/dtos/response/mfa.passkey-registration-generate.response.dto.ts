import { z } from 'zod';

/** @public */
export const MfaPasskeyRegistrationGenerateResponseSchema = z.object({
    challengeToken: z.string().meta({
        description:
            'Challenge token to send back with the registration response',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    }),
    expiresInMs: z.number().meta({
        description: 'Challenge token TTL in milliseconds',
        example: 300000,
    }),
    passkeyOptions: z
        .object({
            challenge: z.string().meta({
                description: 'Base64url challenge the authenticator signs',
                example: 'challengeQuartz',
            }),
            rp: z.object({
                id: z.string().exactOptional(),
                name: z.string(),
            }),
            user: z.object({
                id: z.string(),
                name: z.string(),
                displayName: z.string(),
            }),
            pubKeyCredParams: z.array(
                z.object({ alg: z.number(), type: z.string() })
            ),
            timeout: z.number().exactOptional(),
            attestation: z.string().exactOptional(),
            excludeCredentials: z
                .array(
                    z.object({
                        id: z.string(),
                        type: z.string(),
                        transports: z.array(z.string()).exactOptional(),
                    })
                )
                .exactOptional(),
            authenticatorSelection: z
                .object({
                    authenticatorAttachment: z.string().exactOptional(),
                    requireResidentKey: z.boolean().exactOptional(),
                    residentKey: z.string().exactOptional(),
                    userVerification: z.string().exactOptional(),
                })
                .exactOptional(),
            extensions: z
                .object({ credProps: z.boolean().exactOptional() })
                .exactOptional(),
            hints: z.array(z.string()).exactOptional(),
        })
        .meta({
            description:
                'Options to pass to navigator.credentials.create as JSON',
        }),
});

/** @public */
export type MfaPasskeyRegistrationGenerateResponseDto = z.infer<
    typeof MfaPasskeyRegistrationGenerateResponseSchema
>;
