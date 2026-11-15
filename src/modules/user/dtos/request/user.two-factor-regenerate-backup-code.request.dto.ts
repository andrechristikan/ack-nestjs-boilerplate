import { z } from 'zod';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @alias */
export const UserTwoFactorRegenerateBackupCodeRequestSchema =
    UserReauthenticationRequestSchema;

/** @public */
export type UserTwoFactorRegenerateBackupCodeRequestDto = z.infer<
    typeof UserTwoFactorRegenerateBackupCodeRequestSchema
>;
