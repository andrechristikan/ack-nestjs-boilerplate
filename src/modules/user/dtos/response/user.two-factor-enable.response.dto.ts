import { z } from 'zod';

/**
 * Backup codes issued when two-factor authentication is enabled or regenerated.
 * @public
 */
export const UserTwoFactorEnableResponseSchema = z.object({
    backupCodes: z.array(z.string()).meta({
        description:
            'List of newly generated backup codes. Each code can be used once.',
        example: ['ABCD1234EF', 'ZXCV5678GH'],
    }),
});

/**
 * Backup codes issued by enabling or regenerating two-factor.
 * @public
 */
export type UserTwoFactorEnableResponseDto = z.infer<
    typeof UserTwoFactorEnableResponseSchema
>;
