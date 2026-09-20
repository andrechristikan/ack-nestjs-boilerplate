import { z } from 'zod';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/**
 * Validates the body for checking an email.
 * @public
 */
export const UserCheckEmailRequestSchema = UserCreateRequestSchema.pick({
    email: true,
});

/**
 * Body for checking an email.
 * @public
 */
export type UserCheckEmailRequestDto = z.infer<
    typeof UserCheckEmailRequestSchema
>;
