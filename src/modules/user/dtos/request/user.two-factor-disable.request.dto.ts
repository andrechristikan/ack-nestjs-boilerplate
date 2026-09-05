import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';

export const UserTwoFactorDisableRequestSchema =
    UserLoginVerifyTwoFactorRequestSchema.omit({ challengeToken: true });

export type UserTwoFactorDisableRequestDto = z.infer<
    typeof UserTwoFactorDisableRequestSchema
>;
