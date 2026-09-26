import type { Prisma, ProjectMember } from '@generated/prisma-client/client';
import type { IRole } from '@modules/role/interfaces/role.interface';
import type { ProjectMemberRoleInclude } from '@modules/project/constants/project.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectMember extends ProjectMember {
    user: IUserRef;
    role: IRole;
}

export interface IProjectMemberWithRole extends ProjectMember {
    role: IRole;
}

export type IProjectMemberWithRolePolicies = Prisma.ProjectMemberGetPayload<{
    include: typeof ProjectMemberRoleInclude;
}>;

export interface IProjectCreate {
    name: string;
    description?: string;
}

export interface IProjectUpdate {
    name?: string;
    description?: string;
}
