import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    User,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IRequestStorePatch } from '@common/request/interfaces/request.interface';
import type {
    WorkspaceInvitePreviewInclude,
    WorkspaceInviteUserListSelect,
} from '@modules/workspace/constants/workspace.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

export interface IWorkspaceContext {
    workspaceId: string;
    workspace: Workspace;
    workspaceMember: WorkspaceMember;
}

export type IWorkspaceContextPatch = IRequestStorePatch<IWorkspaceContext>;

export interface IWorkspaceWithMembers extends Workspace {
    members: WorkspaceMember[];
}

export interface IWorkspaceMember extends WorkspaceMember {
    user: IUserRef;
}

export interface IWorkspaceWithJoinMembers extends Workspace {
    members: Pick<WorkspaceMember, 'userId' | 'role'>[];
}

export interface IWorkspaceJoinable {
    workspace: Workspace;
    reviewerIds: string[];
}

export interface IWorkspaceTransferMember extends WorkspaceMember {
    user: Pick<User, 'status' | 'deletedAt'>;
}

export interface IWorkspaceTransfer {
    ownerMember: WorkspaceMember;
    targetMember: WorkspaceMember;
}

export interface IWorkspaceWithTransferMembers extends Workspace {
    members: IWorkspaceTransferMember[];
}

export type IWorkspaceMemberWithEmail = Prisma.WorkspaceMemberGetPayload<{
    include: { user: { select: { email: true } } };
}>;

export type IWorkspaceJoinRequestWithEmail =
    Prisma.WorkspaceJoinRequestGetPayload<{
        include: { user: { select: { email: true } } };
    }>;

export type IWorkspaceInviteList = Prisma.WorkspaceInviteGetPayload<{
    select: typeof WorkspaceInviteUserListSelect;
}>;

export type IWorkspaceInvitePreview = Prisma.WorkspaceInviteGetPayload<{
    include: typeof WorkspaceInvitePreviewInclude;
}>;

export interface IWorkspaceInviteNotice {
    workspaceName: string;
    inviterName: string;
    inviteeUserId: string | null;
}

export interface IWorkspaceInviteTokenData {
    token: string;
    hashedToken: string;
    reference: string;
    expiredAt: Date;
    claimLink: string;
    signUpLink: string;
}

export interface IWorkspaceInvitePrepared {
    workspaceInviteId: string;
    nonce: string;
    expiresInDays: number;
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
    nonce: string;
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

export interface IWorkspaceJoinRequestPrepared {
    nonce: string;
    expiredAt: Date;
}

export interface IWorkspaceJoinRequestNotice {
    workspaceName: string;
    requesterName: string;
    reviewerIds: string[];
}

export interface IWorkspaceJoinRequestCreateData {
    workspaceId: string;
    userId: string;
    message: string | null;
    expiredAt: Date;
    nonce: string;
}

export interface IWorkspaceExpireStaleInvitesQueueResponse extends IQueueResponse {
    countExpiredInvites: number;
}

export interface IWorkspaceExpireStaleJoinRequestsQueueResponse extends IQueueResponse {
    countExpiredJoinRequests: number;
}
