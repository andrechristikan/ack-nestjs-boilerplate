import type { Project, ProjectMember } from '@generated/prisma-client/client';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import type { IRequestStorePatch } from '@common/request/interfaces/request.interface';
import type {
    EnumProjectProcess,
    EnumProjectQueue,
} from '@modules/project/enums/project.enum';
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

export interface IProjectSoftDeleteByWorkspacePayload {
    workspaceId: string;
    deletedAt: string;
    deletedBy: string;
}

export interface IProjectSoftDeleteByWorkspaceEffect extends IOutboxEffect {
    queue: EnumProjectQueue.project;
    name: EnumProjectProcess.softDeleteByWorkspace;
    data: IProjectSoftDeleteByWorkspacePayload;
}
