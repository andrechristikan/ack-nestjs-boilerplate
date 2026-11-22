import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const UserDeleteSelfRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type UserDeleteSelfRequestDto = z.infer<
    typeof UserDeleteSelfRequestSchema
>;
