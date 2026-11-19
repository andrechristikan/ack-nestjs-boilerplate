import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import {
    ProjectDefaultAvailableSearch,
    ProjectOrderBy,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumProjectOrderBy } from '@modules/project/enums/project.enum';

@Injectable()
export class ProjectGetListOffsetByAdminUseCase implements IAppUseCase<
    [ProjectAdminListRequestDto],
    IResponsePaginationReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableSearch: ProjectDefaultAvailableSearch,
            orderBy: ProjectOrderBy,
            defaultOrderBy: EnumProjectOrderBy.latest,
        });
        const workspaceFilter = this.paginationFilterUtil.equalString(
            Prisma.ProjectScalarFieldEnum.workspaceId,
            query.workspaceId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(workspaceFilter?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.projectService.getListOffsetByAdmin(
                params,
                workspaceFilter?.where ?? null
            );

        return {
            data,
            ...others,
        };
    }
}
