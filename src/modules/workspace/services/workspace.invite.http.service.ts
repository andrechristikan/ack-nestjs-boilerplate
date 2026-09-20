import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteHttpService {
    constructor(
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceInviteList>> {
        const { data, ...others } =
            await this.workspaceInviteDomain.getInvitesList(
                workspaceId,
                pagination,
                status
            );

        return {
            data,
            ...others,
        };
    }

    async createInvite(
        workspace: Workspace,
        actorId: string,
        {
            email,
            workspaceRole,
            projectId,
            projectRole,
            expiryDuration,
        }: WorkspaceInviteCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        const invite = await this.workspaceInviteDomain.createInvite(
            workspace,
            actorId,
            { email, workspaceRole, projectId, projectRole, expiryDuration }
        );

        return { data: invite };
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        const invite = await this.workspaceInviteDomain.resendInvite(
            workspace,
            actorId,
            workspaceInviteId,
            expiryDuration
        );

        return { data: invite };
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void> {
        await this.workspaceInviteDomain.revokeInvite(
            workspaceId,
            actorId,
            workspaceInviteId
        );
    }

    async claimInvite(
        userId: string,
        userEmail: string,
        { inviteToken }: WorkspaceInviteClaimRequestDto
    ): Promise<void> {
        await this.workspaceInviteDomain.claimInvite(
            userId,
            userEmail,
            inviteToken
        );
    }

    async previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        const { workspace, invite, inviter } =
            await this.workspaceInviteDomain.previewInvite(inviteToken);

        const preview = this.workspaceUtil.mapInvitePreview(
            workspace,
            invite,
            inviter
        );

        return { data: preview };
    }
}
