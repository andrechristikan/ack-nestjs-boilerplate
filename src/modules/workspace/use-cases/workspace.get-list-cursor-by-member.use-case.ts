import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceCursorAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetListCursorByMemberUseCase implements IAppUseCase<
    [string, WorkspaceUserListRequestDto],
    IResponsePaginationReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: WorkspaceUserListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceWhereInput>(query, {
                scope: WorkspaceUserListCursorScope,
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceService.getListCursorByMember(userId, params);

        return {
            data,
            ...others,
        };
    }
}
