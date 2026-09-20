import { z } from 'zod';
import { RoleSchema } from '@modules/role/dtos/role.dto';

/**
 * Shapes a role in a list, with a policy count instead of its policies.
 * @public
 */
export const RoleListResponseSchema = RoleSchema.omit({
    description: true,
    policies: true,
}).extend({
    policies: z.number().meta({
        description: 'count of policies',
        example: 3,
    }),
});

/**
 * Role as it appears in a list.
 * @public
 */
export type RoleListResponseDto = z.infer<typeof RoleListResponseSchema>;
