import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceMemberRole,
    Prisma,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client';
import { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';

export interface IWorkspaceService {
    validateWorkspaceGuard(workspaceId: string | null): Promise<Workspace>;
    validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<WorkspaceMember>;
    validateWorkspaceRoleGuard(
        member: WorkspaceMember | null,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember;
    validateInviteToken(token: string): Promise<WorkspaceInvite>;

    getListForMember(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceSelect,
            Prisma.WorkspaceWhereInput
        >
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>>;
    createWorkspace(
        userId: string,
        dto: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    getCurrentWorkspace(
        workspace: Workspace
    ): IResponseReturn<WorkspaceResponseDto>;
    updateWorkspace(
        workspaceId: string,
        actorId: string,
        dto: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    switchWorkspace(userId: string, workspaceId: string): Promise<void>;
    transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void>;
    leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void>;
    softDeleteWorkspace(workspaceId: string, actorId: string): Promise<void>;

    getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceMemberSelect,
            Prisma.WorkspaceMemberWhereInput
        >,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>>;
    updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void>;
    removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void>;

    getListForAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceSelect,
            Prisma.WorkspaceWhereInput
        >,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>>;
    getByIdForAdmin(
        workspaceId: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>>;
    getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceMemberSelect,
            Prisma.WorkspaceMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>>;

    getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceInviteSelect,
            Prisma.WorkspaceInviteWhereInput
        >,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInviteResponseDto>>;
    createInvite(
        workspace: Workspace,
        actorId: string,
        dto: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>>;
    resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>>;
    revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void>;
    claimInvite(
        userId: string,
        userEmail: string,
        inviteToken: string
    ): Promise<void>;
    previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>>;

    previewWorkspace(
        slug: string
    ): Promise<IResponseReturn<WorkspacePreviewResponseDto>>;

    createJoinRequest(
        userId: string,
        dto: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequestResponseDto>>;
    getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceJoinRequestSelect,
            Prisma.WorkspaceJoinRequestWhereInput
        >,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequestResponseDto>>;
    acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<void>;
    rejectJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void>;
}
