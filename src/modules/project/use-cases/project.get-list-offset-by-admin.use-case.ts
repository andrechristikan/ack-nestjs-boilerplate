import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetListOffsetByAdminUseCase implements IAppUseCase<
    [ProjectAdminListRequestDto],
    IResponsePaginationReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ProjectWhereInput>(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectDefaultAvailableOrderBy,
            });
        const workspaceId = query.workspaceId ?? null;
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(workspaceId ? { workspaceId } : {}),
            },
        });

        const { data, ...others } =
            await this.projectService.getListOffsetByAdmin(params, workspaceId);

        return {
            data,
            ...others,
        };
    }
}
