import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/** @public */
export const UserTwoFactorSetupRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.pick({ backupCode: true }).extend({
        password: z.string().min(1).meta({
            description: 'current string password',
            example: 'Current-pass1',
        }),
    });

/** @public */
export type UserTwoFactorSetupRequestDto = z.infer<
    typeof UserTwoFactorSetupRequestSchema
>;
