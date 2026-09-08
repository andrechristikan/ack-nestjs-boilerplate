import { z } from 'zod';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

export const UserImportRequestSchema = UserCreateRequestSchema.pick({
    email: true,
    name: true,
    username: true,
});

export type UserImportRequestDto = z.infer<typeof UserImportRequestSchema>;
