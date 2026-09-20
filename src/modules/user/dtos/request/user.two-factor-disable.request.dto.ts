import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/**
 * Validates the body for disabling two-factor authentication.
 * @public
 */
export const UserTwoFactorDisableRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true });

/**
 * Body for disabling two-factor authentication.
 * @public
 */
export type UserTwoFactorDisableRequestDto = z.infer<
    typeof UserTwoFactorDisableRequestSchema
>;
