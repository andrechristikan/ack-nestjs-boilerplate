import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const UserDeleteMobileNumberRequestSchema =
    UserReauthenticationRequestSchema;

/** @public */
export type UserDeleteMobileNumberRequestDto = z.infer<
    typeof UserDeleteMobileNumberRequestSchema
>;
