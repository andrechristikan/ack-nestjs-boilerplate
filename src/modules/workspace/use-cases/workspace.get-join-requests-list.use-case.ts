import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import {
    WorkspaceJoinRequestDefaultAvailableOrderBy,
    WorkspaceJoinRequestDefaultStatus,
    WorkspaceJoinRequestUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceJoinRequestListRequestDto } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceGetJoinRequestsListUseCase implements IAppUseCase<
    [IWorkspaceContext, WorkspaceJoinRequestListRequestDto],
    IResponsePaginationReturn<WorkspaceJoinRequest>
> {
    constructor(
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        query: WorkspaceJoinRequestListRequestDto
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        // Sequential by design: gate before the work it guards
        await this.workspaceJoinRequestService.assertJoinRequestAllowed();

        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceJoinRequestWhereInput>(
                query,
                {
                    scope: WorkspaceJoinRequestUserListCursorScope,
                    availableOrderBy:
                        WorkspaceJoinRequestDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationFilterUtil.inEnum(
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
            await this.workspaceJoinRequestService.getJoinRequestsList(
                workspaceContext.workspace.id,
                params,
                status?.where
            );

        return {
            data,
            ...others,
        };
    }
}
