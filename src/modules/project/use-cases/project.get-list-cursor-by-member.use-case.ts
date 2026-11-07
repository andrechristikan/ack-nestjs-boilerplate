import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetListCursorByMemberUseCase implements IAppUseCase<
    [string, WorkspaceMember, ProjectUserListRequestDto],
    IResponsePaginationReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        workspaceId: string,
        workspaceMember: WorkspaceMember,
        query: ProjectUserListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectWhereInput>(query, {
                scope: ProjectUserListCursorScope,
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectService.getListCursorByMember(
                workspaceId,
                workspaceMember,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
