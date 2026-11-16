import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @public */
export const UserTwoFactorEnableRequestSchema =
    UserReauthenticationRequestSchema.omit({
        method: true,
        backupCode: true,
    }).extend({
        code: z
            .string()
            .min(1)
            .max(32)
            .regex(/^[0-9]+$/, {
                error: () => 'auth.error.twoFactorCodeRequired',
            })
            .meta({
                description:
                    'digit code from the new authenticator app, at most 32 characters',
                example: '654321',
            }),
    });

/** @public */
export type UserTwoFactorEnableRequestDto = z.infer<
    typeof UserTwoFactorEnableRequestSchema
>;
