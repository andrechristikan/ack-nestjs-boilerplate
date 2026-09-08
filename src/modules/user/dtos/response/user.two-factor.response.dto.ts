import { z } from 'zod';
import { UserTwoFactorSetupResponseSchema } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';

/**
 * Two-factor challenge handed back mid-login, carrying setup material only when setup is required.
 */
export const UserTwoFactorResponseSchema =
    UserTwoFactorSetupResponseSchema.partial().extend({
        isRequiredSetup: z.boolean().meta({
            description:
                'Indicates whether the user is required to set up 2FA upon next login',
            example: false,
        }),
        challengeToken: z.string().meta({
            description: 'Challenge token to be used for completing 2FA login',
            example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
        }),
        challengeExpiresInMs: z.number().meta({
            description: 'Challenge token TTL in milliseconds',
            example: 300,
        }),
        backupCodesRemaining: z.number().meta({
            description: 'Remaining backup codes count for the account',
            example: 8,
        }),
    });

export type UserTwoFactorResponseDto = z.infer<
    typeof UserTwoFactorResponseSchema
>;
