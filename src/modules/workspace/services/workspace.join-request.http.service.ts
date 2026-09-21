import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import type { WorkspaceJoinRequestCreateRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
import type { WorkspaceJoinRequestRejectRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceJoinRequestHttpService {
    constructor(
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
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
        query: WorkspaceJoinRequestListRequestDto
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceJoinRequestWhereInput>(
                query,
                {
                    availableOrderBy:
                        WorkspaceJoinRequestDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationQueryUtil.inEnum(
            Prisma.WorkspaceJoinRequestScalarFieldEnum.status,
            query.status,
            WorkspaceJoinRequestDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceJoinRequestDomain.getJoinRequestsList(
                workspaceId,
                params,
                status?.where
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
