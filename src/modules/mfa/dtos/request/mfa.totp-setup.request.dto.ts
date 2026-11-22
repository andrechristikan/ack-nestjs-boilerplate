import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const MfaTotpSetupRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type MfaTotpSetupRequestDto = z.infer<typeof MfaTotpSetupRequestSchema>;
