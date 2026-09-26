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
