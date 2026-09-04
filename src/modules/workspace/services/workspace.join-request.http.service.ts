import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestResponseDto } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';
import { IWorkspaceJoinRequestHttpService } from '@modules/workspace/interfaces/workspace.join-request.http.service.interface';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestHttpService implements IWorkspaceJoinRequestHttpService {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async createJoinRequest(
        userId: string,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequestResponseDto>> {
        const joinRequest =
            await this.workspaceJoinRequestService.createJoinRequest(userId, {
                workspaceId,
                message,
            });

        return { data: this.workspaceUtil.mapJoinRequest(joinRequest) };
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequestResponseDto>> {
        const { data, ...others } =
            await this.workspaceJoinRequestService.getJoinRequestsList(
                workspaceId,
                pagination,
                status
            );

        return {
            data: this.workspaceUtil.mapJoinRequestList(data),
            ...others,
        };
    }

    async acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.workspaceJoinRequestService.acceptJoinRequest(
            workspace,
            reviewerId,
            workspaceJoinRequestId
        );
    }

    async rejectJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string,
        { rejectReasonCode }: WorkspaceJoinRequestRejectRequestDto
    ): Promise<void> {
        await this.workspaceJoinRequestService.rejectJoinRequest(
            workspace,
            reviewerId,
            workspaceJoinRequestId,
            rejectReasonCode
        );
    }
}
