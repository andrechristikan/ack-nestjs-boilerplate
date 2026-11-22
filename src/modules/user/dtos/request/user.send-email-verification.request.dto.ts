import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

/** @public */
export const UserSendEmailVerificationRequestSchema =
    UserLoginRequestSchema.pick({
        email: true,
    });

/** @public */
export type UserSendEmailVerificationRequestDto = z.infer<
    typeof UserSendEmailVerificationRequestSchema
>;
