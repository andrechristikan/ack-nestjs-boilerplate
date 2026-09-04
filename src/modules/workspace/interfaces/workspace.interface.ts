import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

export interface IWorkspaceMember extends WorkspaceMember {
    user: IUserRef;
}

export interface IWorkspaceInviteInviter {
    name: string | null;
    username: string;
}

export interface IWorkspaceInviteTokenData {
    token: string;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    link: string;
}

export interface IWorkspaceJoinRequestRequester {
    name: string | null;
    username: string;
}

export interface IWorkspaceCreate {
    name: string;
    description?: string;
    isPublic?: boolean;
    slug?: string;
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

export interface IWorkspaceInvitePreview {
    workspace: Workspace;
    invite: WorkspaceInvite;
    inviter: IWorkspaceInviteInviter | null;
}

export interface IWorkspaceJoinRequestCreate {
    workspaceId: string;
    message?: string;
}
