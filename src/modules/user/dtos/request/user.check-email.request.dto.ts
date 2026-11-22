import { z } from 'zod';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/** @public */
export const UserCheckEmailRequestSchema = UserCreateRequestSchema.pick({
    email: true,
});

/** @public */
export type UserCheckEmailRequestDto = z.infer<
    typeof UserCheckEmailRequestSchema
>;
