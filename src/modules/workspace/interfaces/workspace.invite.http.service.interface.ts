import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Workspace, WorkspaceInvite } from '@generated/prisma-client';
import { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';

export interface IWorkspaceInviteHttpService {
    getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInvite>>;
    createInvite(
        workspace: Workspace,
        actorId: string,
        body: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>>;
    resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        body: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>>;
    revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void>;
    claimInvite(
        userId: string,
        userEmail: string,
        body: WorkspaceInviteClaimRequestDto
    ): Promise<void>;
    previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>>;
}
