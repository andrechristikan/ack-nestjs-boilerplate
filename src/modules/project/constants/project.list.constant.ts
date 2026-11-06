import { Prisma } from '@generated/prisma-client/client';

/** @public */
export const ProjectDefaultAvailableSearch = [
    Prisma.ProjectScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/** @public */
export const ProjectDefaultAvailableOrderBy = [
    Prisma.ProjectScalarFieldEnum.createdAt,
    Prisma.ProjectScalarFieldEnum.name,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/** @public */
export const ProjectCursorAvailableOrderBy = [
    Prisma.ProjectScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.ProjectScalarFieldEnum>;

/** @public */
export const ProjectMemberDefaultAvailableOrderBy = [
    Prisma.ProjectMemberScalarFieldEnum.joinedAt,
] as const satisfies ReadonlyArray<Prisma.ProjectMemberScalarFieldEnum>;

/** @public */
export const ProjectUserListCursorScope = 'ProjectUserListCursorScope';

/** @public */
export const ProjectMemberUserListCursorScope =
    'ProjectMemberUserListCursorScope';
