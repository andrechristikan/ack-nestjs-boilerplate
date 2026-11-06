import { z } from 'zod';
import { RoleSchema } from '@modules/role/dtos/role.dto';

/** @public */
export const RoleListResponseSchema = RoleSchema.omit({
    description: true,
    policies: true,
}).extend({
    policies: z.number().meta({
        description: 'count of policies',
        example: 3,
    }),
});

/** @public */
export type RoleListResponseDto = z.infer<typeof RoleListResponseSchema>;
