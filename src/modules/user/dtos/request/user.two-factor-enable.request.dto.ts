import { z } from 'zod';

export const UserTwoFactorEnableRequestSchema = z.strictObject({
    code: z
        .string()
        .min(1)
        .regex(/^[0-9]+$/, {
            error: () => 'auth.error.twoFactorCodeRequired',
        })
        .meta({
            description: 'digit code from authenticator app',
            example: '654321',
        }),
});

export type UserTwoFactorEnableRequestDto = z.infer<
    typeof UserTwoFactorEnableRequestSchema
>;
