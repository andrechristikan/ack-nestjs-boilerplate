import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

/** @public */
export const UserLoginSetupTwoFactorRequestSchema =
    UserTwoFactorEnableRequestSchema.omit({ password: true }).extend({
        challengeToken:
            UserLoginVerifyTwoFactorRequestSchema.shape.challengeToken,
    });

/** @public */
export type UserLoginSetupTwoFactorRequestDto = z.infer<
    typeof UserLoginSetupTwoFactorRequestSchema
>;
