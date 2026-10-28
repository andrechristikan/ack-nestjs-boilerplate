import type {
    Prisma,
    Project,
    ProjectMember,
} from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IProjectMember extends ProjectMember {
    user: IUserRef;
}

export interface IProjectCreate {
    name: string;
    description: string | null;
}

export interface IProjectUpdate {
    name: string;
    description: string | null;
}

export type IProjectField = Extract<keyof Project, string>;

export type IProjectFieldValue = NonNullable<Project[IProjectField]>;

export type IProjectMemberField = Extract<keyof ProjectMember, string>;

export type IProjectMemberFieldValue = NonNullable<
    ProjectMember[IProjectMemberField]
>;

export type IProjectActiveFilter = NonNullable<Prisma.ProjectWhereInput['OR']>;
