import { z } from 'zod';
import { UserListResponseSchema } from '@modules/user/dtos/response/user.list.response.dto';

/** @public */
export const UserExportResponseSchema = UserListResponseSchema.omit({
    role: true,
    photo: true,
}).extend({
    photo: z.string().nullable().meta({
        description: 'User photo URL',
        example: 'https://example.com/photo.jpg',
    }),
    role: z.string().meta({
        description: 'User role',
        example: 'admin',
    }),
});

/** @public */
export type UserExportResponseDto = z.infer<typeof UserExportResponseSchema>;
