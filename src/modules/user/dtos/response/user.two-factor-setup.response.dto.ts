import { z } from 'zod';

/**
 * Secret material handed to the client to register an authenticator app.
 * @public
 */
export const UserTwoFactorSetupResponseSchema = z.object({
    secret: z.string().meta({
        description: 'Base32 encoded secret to be stored in authenticator apps',
        example: 'JBSWY3DPEHPK3PXP',
    }),
    otpauthUrl: z.string().meta({
        description:
            'otpauth URL compatible with Google Authenticator and similar apps',
        example:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
    }),
});

/**
 * Authenticator app setup material.
 * @public
 */
export type UserTwoFactorSetupResponseDto = z.infer<
    typeof UserTwoFactorSetupResponseSchema
>;
