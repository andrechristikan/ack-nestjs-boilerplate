import { z } from 'zod';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';

export const UserSendEmailVerificationRequestSchema =
    UserLoginRequestSchema.pick({
        email: true,
    });

export type UserSendEmailVerificationRequestDto = z.infer<
    typeof UserSendEmailVerificationRequestSchema
>;
