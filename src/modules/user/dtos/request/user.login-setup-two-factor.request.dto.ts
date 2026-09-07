import { z } from 'zod';
import { UserLoginVerifyTwoFactorRequestSchema } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

export const UserLoginSetupTwoFactorRequestSchema =
    UserTwoFactorEnableRequestSchema.extend(
        UserLoginVerifyTwoFactorRequestSchema.pick({ challengeToken: true })
            .shape
    );

export type UserLoginSetupTwoFactorRequestDto = z.infer<
    typeof UserLoginSetupTwoFactorRequestSchema
>;
