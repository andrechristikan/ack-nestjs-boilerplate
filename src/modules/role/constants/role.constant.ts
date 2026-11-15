import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IRoleRank,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';

/** @public */
export const RoleRequiredMetaKey = 'RoleRequiredMetaKey';

/** @public */
export const RoleRank: IRoleRank = {
    [EnumRoleType.superAdmin]: 3,
    [EnumRoleType.admin]: 2,
    [EnumRoleType.user]: 1,
};

/** @public */
export const RoleWithPoliciesCacheSchema = z.object({
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
export const RoleProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumRoleStatusCodeError.forbidden,
        messagePath: 'role.error.forbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
];
