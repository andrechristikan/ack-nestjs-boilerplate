import type {
    Prisma,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IRole } from '@modules/role/interfaces/role.interface';
import type {
    WorkspaceInviteRoleInclude,
    WorkspaceInviteUserListSelect,
} from '@modules/workspace/constants/workspace.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

export interface IWorkspaceMember extends WorkspaceMember {
    user: IUserRef;
    role: IRole;
}

export interface IWorkspaceMemberWithRole extends WorkspaceMember {
    role: IRole;
}

export type IWorkspaceInviteWithRole = Prisma.WorkspaceInviteGetPayload<{
    include: typeof WorkspaceInviteRoleInclude;
}>;

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
    workspaceRoleId: string;
    projectId?: string;
    projectRoleId?: string;
    expiryDuration?: EnumWorkspaceInviteExpiry;
}

export interface IWorkspaceInviteCreateData {
    workspaceInviteId: string;
    workspaceId: string;
    email: string;
    workspaceRoleId: string;
    projectId?: string;
    projectRoleId?: string;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    invitedByUserId: string;
}

export interface IWorkspaceInvitePreview {
    workspace: Workspace;
    invite: IWorkspaceInviteWithRole;
    inviter: IWorkspaceInviteInviter | null;
}

export interface IWorkspaceInvitePreviewSummary {
    workspaceName: string;
    inviterName: string;
    workspaceRole: IRole;
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
