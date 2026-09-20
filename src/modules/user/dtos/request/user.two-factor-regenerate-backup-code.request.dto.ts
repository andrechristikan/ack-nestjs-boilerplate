import { z } from 'zod';
import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';

/**
 * Validates the body for regenerating two-factor backup codes.
 * @public
 */
export const UserTwoFactorRegenerateBackupCodeRequestSchema =
    UserTwoFactorEnableRequestSchema;

/**
 * Body for regenerating two-factor backup codes.
 * @public
 */
export type UserTwoFactorRegenerateBackupCodeRequestDto = z.infer<
    typeof UserTwoFactorRegenerateBackupCodeRequestSchema
>;
