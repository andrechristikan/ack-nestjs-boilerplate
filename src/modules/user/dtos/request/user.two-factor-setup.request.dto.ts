import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/**
 * Validates the body for starting two-factor setup; a backup code is required while two-factor is enabled, and a missing body reads as an empty one.
 * @public
 */
export const UserTwoFactorSetupRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.pick({ backupCode: true }).default(
        {}
    );

/**
 * Body for starting two-factor setup.
 * @public
 */
export type UserTwoFactorSetupRequestDto = z.infer<
    typeof UserTwoFactorSetupRequestSchema
>;
