import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetListOffsetByAdminUseCase implements IAppUseCase<
    [WorkspaceAdminListRequestDto],
    IResponsePaginationReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: WorkspaceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceWhereInput>(query, {
                availableSearch: WorkspaceDefaultAvailableSearch,
                availableOrderBy: WorkspaceDefaultAvailableOrderBy,
            });
        const isPublic = this.paginationFilterUtil.equalBoolean(
            Prisma.WorkspaceScalarFieldEnum.isPublic,
            query.isPublic
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isPublic?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceService.getListOffsetByAdmin(
                params,
                isPublic?.where
            );

        return {
            data,
            ...others,
        };
    }
}
