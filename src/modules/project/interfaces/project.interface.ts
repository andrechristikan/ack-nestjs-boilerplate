import {
    EnumProjectInviteStatus,
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
    Project,
    ProjectMember,
    User,
} from '@generated/prisma-client';

export type IProject = Project;

export interface IProjectMemberInvite {
    id: string;
    createdAt: Date;
    status: EnumProjectInviteStatus;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
}

export interface IProjectMember extends ProjectMember {
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
        projectInvites: IProjectMemberInvite[];
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
    role: EnumProjectMemberRole;
    status: EnumProjectMemberStatus;
    createdBy: string;
    updatedBy: string;
}

export interface IProjectMemberUpdate {
    updatedBy: string;
    role?: EnumProjectMemberRole;
    status?: EnumProjectMemberStatus;
    deletedAt?: Date | null;
    deletedBy?: string;
}

export interface IProjectMemberDelete {
    deletedAt: Date;
    deletedBy: string;
    updatedBy: string;
}
