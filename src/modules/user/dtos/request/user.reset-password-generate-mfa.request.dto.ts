import { z } from 'zod';
import { UserForgotPasswordResetRequestSchema } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';

/** @public */
export const UserResetPasswordGenerateMfaRequestSchema =
    UserForgotPasswordResetRequestSchema.pick({ token: true });

/** @public */
export type UserResetPasswordGenerateMfaRequestDto = z.infer<
    typeof UserResetPasswordGenerateMfaRequestSchema
>;
