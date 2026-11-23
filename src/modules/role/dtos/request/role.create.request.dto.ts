import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

/** @public */
export const RoleCreateRequestSchema = RoleUpdateRequestSchema.extend({
    description: z.string().max(500).optional().meta({
        description: 'Description of role',
        example: faker.lorem.sentence(),
    }),
    scope: z.enum(EnumRoleScope).meta({
        description: 'Scope the role applies to',
        example: EnumRoleScope.workspace,
    }),
    key: z
        .string()
        .trim()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z][a-zA-Z0-9]*$/)
        .meta({
            description:
                'Immutable key, unique within the scope: a letter, then letters and digits, 3 to 30 characters',
            example: 'auditor',
        }),
});

/** @public */
export type RoleCreateRequestDto = z.infer<typeof RoleCreateRequestSchema>;
