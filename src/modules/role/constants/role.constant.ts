import { Prisma } from '@generated/prisma-client/client';

/**
 * Prisma select for the role identity every assignment and log reads: id, scope, key and name.
 * @public
 */
export const RoleSelect = {
    id: true,
    scope: true,
    key: true,
    name: true,
} as const;

/**
 * Prisma include loading a role's policies.
 * @public
 */
export const RolePoliciesInclude = {
    policies: true,
} as const satisfies Prisma.RoleInclude;
