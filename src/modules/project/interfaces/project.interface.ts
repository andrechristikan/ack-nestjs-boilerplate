import type { Project, ProjectMember } from '@generated/prisma-client/client';
import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import type { IRequestStorePatch } from '@common/request/interfaces/request.interface';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectContext {
    project: Project;
    projectMember: IProjectMemberWithRole | null;
}

export type IProjectContextPatch = IRequestStorePatch<IProjectContext>;

export interface IProjectMemberWithRole extends ProjectMember {
    role: IRoleRef;
}

export interface IProjectMember extends IProjectMemberWithRole {
    user: IUserRef;
}

export interface IProjectMemberActor {
    userId: string;
    hasWorkspaceBypass: boolean;
}

export interface IProjectCreate {
    name: string;
    description: string | null;
}

export interface IProjectUpdate {
    name: string;
    description: string | null;
}
