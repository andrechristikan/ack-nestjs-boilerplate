import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

/**
 * Validates the body for enabling required two-factor during login.
 * @public
 */
export const UserLoginSetupTwoFactorRequestSchema =
    UserTwoFactorEnableRequestSchema.extend({
        challengeToken:
            UserLoginVerifyTwoFactorRequestSchema.shape.challengeToken,
    });

/**
 * Body for enabling required two-factor during login.
 * @public
 */
export type UserLoginSetupTwoFactorRequestDto = z.infer<
    typeof UserLoginSetupTwoFactorRequestSchema
>;
