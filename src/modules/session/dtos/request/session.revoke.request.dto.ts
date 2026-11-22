import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const SessionRevokeRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type SessionRevokeRequestDto = z.infer<
    typeof SessionRevokeRequestSchema
>;
