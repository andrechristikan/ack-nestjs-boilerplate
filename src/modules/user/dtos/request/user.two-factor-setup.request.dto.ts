import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @public */
export const UserTwoFactorSetupRequestSchema =
    UserReauthenticationRequestSchema.omit({ method: true, code: true });

/** @public */
export type UserTwoFactorSetupRequestDto = z.infer<
    typeof UserTwoFactorSetupRequestSchema
>;
