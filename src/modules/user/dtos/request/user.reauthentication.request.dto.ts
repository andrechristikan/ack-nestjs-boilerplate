import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/** @public */
export const UserReauthenticationRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.pick({
        method: true,
        code: true,
        backupCode: true,
    })
        .partial()
        .extend({
            password: z
                .string()
                .min(1)
                .meta({
                    description:
                        'current string password, required when the account has one',
                    example: 'Current-pass1',
                })
                .optional(),
            otp: z
                .string()
                .min(1)
                .meta({
                    description:
                        'one-time code sent to the account email, for an account with no password and no two-factor',
                    example: '123456',
                })
                .optional(),
        });

/** @public */
export type UserReauthenticationRequestDto = z.infer<
    typeof UserReauthenticationRequestSchema
>;
