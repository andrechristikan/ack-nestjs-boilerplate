import { z } from 'zod';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

/**
 * Validates the body for creating a role; the key is the lowercase identifier, the name is the display label.
 * @public
 */
export const RoleCreateRequestSchema = RoleUpdateRequestSchema.extend({
    scope: z.enum(EnumRoleScope).meta({
        description: 'Scope the role applies to',
        example: EnumRoleScope.workspace,
    }),
    key: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9.]+$/)
        .meta({
            description:
                'Unique key of role within its scope, lowercase letters, digits and dots',
            example: 'workspace.editor',
        }),
});

/**
 * Body for creating a role.
 * @public
 */
export type RoleCreateRequestDto = z.infer<typeof RoleCreateRequestSchema>;
