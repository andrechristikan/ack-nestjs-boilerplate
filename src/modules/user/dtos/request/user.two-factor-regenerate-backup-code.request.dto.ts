import { z } from 'zod';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

export const UserTwoFactorRegenerateBackupCodeRequestSchema =
    UserTwoFactorEnableRequestSchema;

export type UserTwoFactorRegenerateBackupCodeRequestDto = z.infer<
    typeof UserTwoFactorRegenerateBackupCodeRequestSchema
>;
