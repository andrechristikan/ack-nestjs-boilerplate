import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const MfaPasskeyDeleteRequestSchema = UserReauthenticationRequestSchema;

/** @public */
export type MfaPasskeyDeleteRequestDto = z.infer<
    typeof MfaPasskeyDeleteRequestSchema
>;
