import { z } from 'zod';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/**
 * Validates one row of a user import CSV.
 * @public
 */
export const UserImportRequestSchema = UserCreateRequestSchema.pick({
    email: true,
    name: true,
    username: true,
});

/**
 * One row of a user import CSV.
 * @public
 */
export type UserImportRequestDto = z.infer<typeof UserImportRequestSchema>;
