import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import { IWorkspaceInviteHttpService } from '@modules/workspace/interfaces/workspace.invite.http.service.interface';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteHttpService implements IWorkspaceInviteHttpService {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceInviteResponseDto>> {
        const { data, ...others } =
            await this.workspaceInviteService.getInvitesList(
                workspaceId,
                pagination,
                status
            );

        return {
            data: this.workspaceUtil.mapInviteList(data),
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
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        const invite = await this.workspaceInviteService.createInvite(
            workspace,
            actorId,
            { email, workspaceRole, projectId, projectRole, expiryDuration }
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async resendInvite(
        workspace: Workspace,
        actorId: string,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInviteResponseDto>> {
        const invite = await this.workspaceInviteService.resendInvite(
            workspace,
            actorId,
            workspaceInviteId,
            expiryDuration
        );

        return { data: this.workspaceUtil.mapInvite(invite) };
    }

    async revokeInvite(
        workspaceId: string,
        actorId: string,
        workspaceInviteId: string
    ): Promise<void> {
        await this.workspaceInviteService.revokeInvite(
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
        await this.workspaceInviteService.claimInvite(
            userId,
            userEmail,
            inviteToken
        );
    }

    async previewInvite(
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        const { workspace, invite, inviter } =
            await this.workspaceInviteService.previewInvite(inviteToken);

        return {
            data: this.workspaceUtil.mapInvitePreview(
                workspace,
                invite,
                inviter
            ),
        };
    }
}
