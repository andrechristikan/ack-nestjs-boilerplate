import {
    EnumProjectMemberStatus,
    Project,
    ProjectMember,
    Role,
    User,
} from '@generated/prisma-client';

export type IProject = Project;

export interface IProjectMemberInvite {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    acceptedAt: Date | null;
    deletedAt: Date | null;
}

export interface IProjectMember extends ProjectMember {
    role: Role;
    project: Project;
}

export interface IProjectMemberWithUser extends IProjectMember {
    user: User;
}

export interface IProjectMemberWithInvite extends IProjectMember {
    user: {
        id: string;
        email: string;
        isVerified: boolean;
        verifiedAt: Date | null;
        invites: IProjectMemberInvite[];
    };
}

export interface IProjectCreate {
    tenantId: string;
    name: string;
    description: string;
    slug: string;
    createdBy: string;
    updatedBy: string;
}

export interface IProjectUpdate {
    updatedBy: string;
    name?: string;
    description?: string;
    slug?: string;
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

export interface IProjectMemberUpdate {
    updatedBy: string;
    roleId?: string;
    status?: EnumProjectMemberStatus;
}
