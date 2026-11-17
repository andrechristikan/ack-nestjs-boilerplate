import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @public */
export const MfaTotpEnableRequestSchema =
    UserReauthenticationRequestSchema.omit({
        method: true,
        backupCode: true,
    }).extend({
        code: z
            .string()
            .min(1)
            .max(32)
            .regex(/^[0-9]+$/, {
                error: () => 'mfa.error.codeRequired',
            })
            .meta({
                description:
                    'digit code from the new authenticator app, at most 32 characters',
                example: '654321',
            }),
    });

/** @public */
export type MfaTotpEnableRequestDto = z.infer<
    typeof MfaTotpEnableRequestSchema
>;
