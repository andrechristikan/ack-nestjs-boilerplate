import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

/** @public */
export const UserTwoFactorDisableRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true });

/** @public */
export type UserTwoFactorDisableRequestDto = z.infer<
    typeof UserTwoFactorDisableRequestSchema
>;
