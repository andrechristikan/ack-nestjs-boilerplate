import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { WorkspaceInviteUserListSelect } from '@modules/workspace/constants/workspace.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

export interface IWorkspaceMember extends WorkspaceMember {
    user: IUserRef;
}

export type IWorkspaceInviteList = Prisma.WorkspaceInviteGetPayload<{
    select: typeof WorkspaceInviteUserListSelect;
}>;

export interface IWorkspaceInviteInviter {
    name: string | null;
    username: string;
}

export interface IWorkspaceInviteTokenData {
    token: string;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    claimLink: string;
    signUpLink: string;
}

export interface IWorkspaceCreate {
    name: string;
    description?: string;
    isPublic?: boolean;
}

export interface IWorkspaceOwnedUser {
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
}

export interface IWorkspaceUpdate {
    name?: string;
    description?: string;
}

export interface IWorkspaceInviteCreate {
    email: Lowercase<string>;
    workspaceRole: EnumWorkspaceMemberRole;
    projectId?: string;
    projectRole?: EnumProjectMemberRole;
    expiryDuration?: EnumWorkspaceInviteExpiry;
}

export interface IWorkspaceInviteCreateData {
    workspaceInviteId: string;
    workspaceId: string;
    email: string;
    workspaceRole: EnumWorkspaceMemberRole;
    projectId?: string;
    projectRole?: EnumProjectMemberRole;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    invitedByUserId: string;
}

export interface IWorkspaceInvitePreview {
    workspace: Workspace;
    invite: WorkspaceInvite;
    inviter: IWorkspaceInviteInviter | null;
}

export interface IWorkspaceInvitePreviewSummary {
    workspaceName: string;
    inviterName: string;
    workspaceRole: EnumWorkspaceMemberRole;
    expiredAt: Date;
}

export interface IWorkspaceJoinRequestCreate {
    workspaceId: string;
    message?: string;
}

export interface IWorkspaceJoinRequestCreateData {
    workspaceId: string;
    userId: string;
    message?: string;
}
