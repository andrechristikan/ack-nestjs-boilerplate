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
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestHttpService {
    constructor(
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain
    ) {}

    async createJoinRequest(
        userId: string,
        { workspaceId, message }: WorkspaceJoinRequestCreateRequestDto
    ): Promise<IResponseReturn<WorkspaceJoinRequest>> {
        const joinRequest =
            await this.workspaceJoinRequestDomain.createJoinRequest(userId, {
                workspaceId,
                message,
            });

        return { data: joinRequest };
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceJoinRequest>> {
        const { data, ...others } =
            await this.workspaceJoinRequestDomain.getJoinRequestsList(
                workspaceId,
                pagination,
                status
            );

        return {
            data,
            ...others,
        };
    }

    async acceptJoinRequest(
        workspace: Workspace,
        reviewerId: string,
        workspaceJoinRequestId: string
    ): Promise<void> {
        await this.workspaceJoinRequestDomain.acceptJoinRequest(
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
        await this.workspaceJoinRequestDomain.rejectJoinRequest(
            workspace,
            reviewerId,
            workspaceJoinRequestId,
            rejectReasonCode
        );
    }
}
