import { z } from 'zod';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

/** @public */
export const UserTwoFactorRegenerateBackupCodeRequestSchema =
    UserTwoFactorEnableRequestSchema.omit({ password: true });

/** @public */
export type UserTwoFactorRegenerateBackupCodeRequestDto = z.infer<
    typeof UserTwoFactorRegenerateBackupCodeRequestSchema
>;
