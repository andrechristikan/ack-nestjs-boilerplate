import { z } from 'zod';
import { RoleSchema } from '@modules/role/dtos/role.dto';

export const RoleListResponseSchema = RoleSchema.omit({
    description: true,
    policies: true,
}).extend({
    policies: z.number().meta({
        description: 'count of policies',
        example: 3,
    }),
});

export type RoleListResponseDto = z.infer<typeof RoleListResponseSchema>;
