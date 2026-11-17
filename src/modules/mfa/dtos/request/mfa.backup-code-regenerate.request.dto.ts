import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const MfaBackupCodeRegenerateRequestSchema =
    UserReauthenticationRequestSchema;

/** @public */
export type MfaBackupCodeRegenerateRequestDto = z.infer<
    typeof MfaBackupCodeRegenerateRequestSchema
>;
