import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    WorkspaceInviteDefaultAvailableSearch,
    WorkspaceInviteDefaultStatus,
    WorkspaceInviteOrderBy,
    WorkspaceInviteUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type {
    IWorkspaceContext,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumWorkspaceInviteOrderBy } from '@modules/workspace/enums/workspace.enum';

@Injectable()
export class WorkspaceGetInvitesListUseCase implements IAppUseCase<
    [IWorkspaceContext, WorkspaceInviteListRequestDto],
    IResponsePaginationReturn<IWorkspaceInviteList>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        query: WorkspaceInviteListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: WorkspaceInviteUserListCursorScope,
            availableSearch: WorkspaceInviteDefaultAvailableSearch,
            orderBy: WorkspaceInviteOrderBy,
            defaultOrderBy: EnumWorkspaceInviteOrderBy.latest,
        });
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
                workspaceContext.workspace.id,
                params,
                status?.where
            );

        return {
            data: data.map(invite =>
                this.workspaceUtil.toCensoredInvite(invite)
            ),
            ...others,
        };
    }
}
