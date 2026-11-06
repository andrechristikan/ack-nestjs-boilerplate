import { z } from 'zod';

/** @public */
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
    password: z.string().min(1).meta({
        description: 'current string password',
        example: 'Current-pass1',
    }),
});

/** @public */
export type UserTwoFactorEnableRequestDto = z.infer<
    typeof UserTwoFactorEnableRequestSchema
>;
