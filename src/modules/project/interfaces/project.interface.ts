import type { Prisma, ProjectMember } from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

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

export type IProjectActiveFilter = NonNullable<Prisma.ProjectWhereInput['OR']>;
