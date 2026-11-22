import { z } from 'zod';
import { UserSchema } from '@modules/user/dtos/user.dto';

/** @public */
export const UserRefResponseSchema = UserSchema.pick({
    id: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
    name: true,
    username: true,
    photo: true,
});

/** @public */
export type UserRefResponseDto = z.infer<typeof UserRefResponseSchema>;
