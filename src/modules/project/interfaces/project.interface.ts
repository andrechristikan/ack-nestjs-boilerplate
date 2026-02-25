import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    Project,
    ProjectMember,
    Role,
    User,
} from '@prisma/client';

export type IProject = Project;

export interface IProjectMemberInvitation {
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

export interface IProjectMemberWithInvitation extends IProjectMember {
    user: {
        id: string;
        email: string;
        isVerified: boolean;
        verifiedAt: Date | null;
        invitations: IProjectMemberInvitation[];
    };
};

export interface IProjectCreate {
    tenantId?: string;
    ownerUserId?: string;
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

export interface IProjectMemberUpdate {
    updatedBy: string;
    roleId?: string;
    status?: EnumProjectMemberStatus;
}
