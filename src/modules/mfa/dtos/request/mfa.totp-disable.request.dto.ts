import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const MfaTotpDisableRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type MfaTotpDisableRequestDto = z.infer<
    typeof MfaTotpDisableRequestSchema
>;
