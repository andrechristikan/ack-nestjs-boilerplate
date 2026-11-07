import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    WorkspaceInviteDefaultAvailableOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
    WorkspaceInviteUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetInvitesListUseCase implements IAppUseCase<
    [string, WorkspaceInviteListRequestDto],
    IResponsePaginationReturn<IWorkspaceInviteList>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        workspaceId: string,
        query: WorkspaceInviteListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceInviteWhereInput>(
                query,
                {
                    scope: WorkspaceInviteUserListCursorScope,
                    availableSearch: WorkspaceInviteDefaultAvailableSearch,
                    availableOrderBy: WorkspaceInviteDefaultAvailableOrderBy,
                }
            );
        const status = this.paginationFilterUtil.inEnum(
            Prisma.WorkspaceInviteScalarFieldEnum.status,
            query.status,
            WorkspaceInviteDefaultStatus
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceInviteService.getInvitesList(
                workspaceId,
                params,
                status?.where
            );

        return {
            data,
            ...others,
        };
    }
}
