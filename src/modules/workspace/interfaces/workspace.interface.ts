import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
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

export interface IWorkspaceInviteInvitee {
    existingUser: User | null;
    recipient: INotificationRecipient | null;
}

export interface IWorkspaceInviteNotificationTarget {
    inviterName: string;
    recipient: INotificationRecipient | null;
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
    description: string | null;
    isPublic: boolean | null;
}

export interface IWorkspaceOwnedUser {
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
}

export interface IWorkspaceUpdate {
    name: string;
    description: string | null;
}

export interface IWorkspaceInviteCreate {
    email: Lowercase<string>;
    workspaceRole: EnumWorkspaceMemberRole;
    projectId: string | null;
    projectRole: EnumProjectMemberRole | null;
    expiryDuration: EnumWorkspaceInviteExpiry | null;
}

export interface IWorkspaceInviteCreateData {
    workspaceInviteId: string;
    workspaceId: string;
    email: string;
    workspaceRole: EnumWorkspaceMemberRole;
    projectId: string | null;
    projectRole: EnumProjectMemberRole | null;
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
    message: string | null;
}

export interface IWorkspaceJoinRequestNotificationTarget {
    requesterName: string;
    reviewerRecipients: INotificationRecipient[];
}

export interface IWorkspaceJoinRequestCreateData {
    workspaceId: string;
    userId: string;
    message: string | null;
}

export type IWorkspaceField = Extract<keyof Workspace, string>;

export type IWorkspaceFieldValue = NonNullable<Workspace[IWorkspaceField]>;

export type IWorkspaceMemberField = Extract<keyof WorkspaceMember, string>;

export type IWorkspaceMemberFieldValue = NonNullable<
    WorkspaceMember[IWorkspaceMemberField]
>;

export type IWorkspaceActiveFilter = NonNullable<
    Prisma.WorkspaceWhereInput['OR']
>;
