import type {
    Prisma,
    Project,
    ProjectMember,
} from '@generated/prisma-client/client';
import type { ProjectRefSelect } from '@modules/project/constants/project.constant';
import type { IRequestStorePatch } from '@common/request/interfaces/request.interface';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export type IProjectRef = Prisma.ProjectGetPayload<{
    select: typeof ProjectRefSelect;
}>;

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
