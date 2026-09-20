import { Prisma } from '@generated/prisma-client/client';

/**
 * Fields the project lists search.
 * @public
 */
export const ProjectDefaultAvailableSearch = [
    Prisma.ProjectScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/**
 * Sort fields the admin offset project list accepts.
 * @public
 */
export const ProjectDefaultAvailableOrderBy = [
    Prisma.ProjectScalarFieldEnum.createdAt,
    Prisma.ProjectScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/**
 * Cursor-route allow-list: every field here is immutable, and a sort key that moves makes a scroll skip and repeat rows.
 * @public
 */
export const ProjectCursorAvailableOrderBy = [
    Prisma.ProjectScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/**
 * Cursor-route allow-list. `joinedAt` is set by the schema default and no repository rewrites it,
 * so the key cannot move a row mid-scroll.
 * @public
 */
export const ProjectMemberDefaultAvailableOrderBy = [
    Prisma.ProjectMemberScalarFieldEnum.joinedAt,
] as const satisfies ReadonlyArray<Prisma.ProjectMemberScalarFieldEnum>;
