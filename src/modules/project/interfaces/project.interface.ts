import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    Project,
    ProjectMember,
    Role,
    Tenant,
    User,
} from '@prisma/client';

export type IProject = Project;

export interface IProjectMember extends ProjectMember {
    project?: Project;
    role?: Role;
    user?: User;
    tenant?: Tenant;
}

export interface IProjectCreate {
    tenantId: string;
    name: string;
    status: EnumProjectStatus;
    createdBy: string;
    updatedBy: string;
}

export interface IProjectUpdate {
    updatedBy: string;
    name?: string;
    status?: EnumProjectStatus;
    deletedAt?: Date | null;
    deletedBy?: string;
}

export interface IProjectMemberCreate {
    projectId: string;
    userId: string;
    roleId: string;
    status: EnumProjectMemberStatus;
    createdBy: string;
    updatedBy: string;
}
