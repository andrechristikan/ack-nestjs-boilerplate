import type { Project, ProjectMember } from '@generated/prisma-client/client';
import type { IRequestStorePatch } from '@common/request/interfaces/request.interface';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectContext {
    project: Project;
    projectMember: ProjectMember | null;
}

export interface IProjectWithMembers extends Project {
    members: ProjectMember[];
}

export type IProjectContextPatch = IRequestStorePatch<IProjectContext>;

export interface IProjectMember extends ProjectMember {
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
