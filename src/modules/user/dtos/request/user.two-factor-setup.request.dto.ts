import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/**
 * Validates the body for starting two-factor setup; the current password is required, and a backup code is required while two-factor is enabled.
 * @public
 */
export const UserTwoFactorSetupRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.pick({ backupCode: true }).extend({
        password: z.string().min(1).meta({
            description: 'current string password',
            example: 'Current-pass1',
        }),
    });

/**
 * Body for starting two-factor setup.
 * @public
 */
export type UserTwoFactorSetupRequestDto = z.infer<
    typeof UserTwoFactorSetupRequestSchema
>;
