import { z } from 'zod';
import { UserListResponseSchema } from '@modules/user/dtos/response/user.list.response.dto';

/**
 * Flattened user row for CSV export: the role and the term-policy flags become scalar columns.
 */
export const UserExportResponseSchema = UserListResponseSchema.omit({
    role: true,
    photo: true,
    termPolicy: true,
}).extend({
    photo: z.string().nullable().meta({
        description: 'User photo URL',
        example: 'https://example.com/photo.jpg',
    }),
    termPolicyTermsOfService: z.boolean().meta({
        description: 'Term of service flag',
        example: true,
    }),
    termPolicyPrivacy: z.boolean().meta({
        description: 'Privacy flag',
        example: true,
    }),
    termPolicyCookies: z.boolean().meta({
        description: 'Cookies flag',
        example: true,
    }),
    termPolicyMarketing: z.boolean().meta({
        description: 'Marketing flag',
        example: true,
    }),
    role: z.string().meta({
        description: 'User role',
        example: 'admin',
    }),
});

export type UserExportResponseDto = z.infer<typeof UserExportResponseSchema>;
