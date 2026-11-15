import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const UserTwoFactorDisableRequestSchema =
    UserReauthenticationRequestSchema;

/** @public */
export type UserTwoFactorDisableRequestDto = z.infer<
    typeof UserTwoFactorDisableRequestSchema
>;
