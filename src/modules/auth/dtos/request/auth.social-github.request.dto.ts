import { z } from 'zod';

/** @public */
export const AuthSocialGithubRequestSchema = z.strictObject({
    code: z.string().trim().min(1).max(255).meta({
        description: 'authorization code GitHub returned to the redirect URI',
        example: 'a1b2c3d4e5f6a7b8c9d0',
    }),
    redirectUri: z.url().max(2048).meta({
        description: 'redirect URI used in the GitHub authorization request',
        example: 'https://app.example.com/auth/github/callback',
    }),
    codeVerifier: z
        .string()
        .min(43)
        .max(128)
        .regex(/^[A-Za-z0-9\-._~]+$/)
        .meta({
            description: 'PKCE code verifier (RFC 7636) of the authorization',
            example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        }),
});

/** @public */
export type AuthSocialGithubRequestDto = z.infer<
    typeof AuthSocialGithubRequestSchema
>;
