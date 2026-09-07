import { z } from 'zod';
import { UserSchema } from '@modules/user/dtos/user.dto';

/**
 * Minimal user shape embedded in another module's response.
 */
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

export type UserRefResponseDto = z.infer<typeof UserRefResponseSchema>;
