import { z } from 'zod';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

/** @public */
export const RoleCacheSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    type: z.enum(EnumRoleType),
    isImmutable: z.boolean(),
    createdAt: z.coerce.date(),
    createdBy: z.string().nullable(),
    updatedAt: z.coerce.date(),
    updatedBy: z.string().nullable(),
    policies: z.array(
        z.object({
            id: z.string(),
            roleId: z.string(),
            subject: z.enum(EnumPolicySubject),
            action: z.array(z.enum(EnumPolicyAction)),
            createdAt: z.coerce.date(),
            createdBy: z.string().nullable(),
            updatedAt: z.coerce.date(),
            updatedBy: z.string().nullable(),
        })
    ),
}) satisfies z.ZodType<IRoleWithPolicies>;

/** @public */
export type RoleCacheDto = z.infer<typeof RoleCacheSchema>;
