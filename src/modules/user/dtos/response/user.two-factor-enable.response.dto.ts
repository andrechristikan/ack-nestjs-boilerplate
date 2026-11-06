import { z } from 'zod';

/** @public */
export const UserTwoFactorEnableResponseSchema = z.object({
    backupCodes: z.array(z.string()).meta({
        description:
            'List of newly generated backup codes. Each code can be used once.',
        example: ['ABCD1234EF', 'ZXCV5678GH'],
    }),
});

/** @public */
export type UserTwoFactorEnableResponseDto = z.infer<
    typeof UserTwoFactorEnableResponseSchema
>;
