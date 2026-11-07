import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import {
    ProjectMemberDefaultAvailableOrderBy,
    ProjectMemberUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetMembersListUseCase implements IAppUseCase<
    [Project, ProjectMemberListRequestDto],
    IResponsePaginationReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        project: Project,
        query: ProjectMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectMemberWhereInput>(
                query,
                {
                    scope: ProjectMemberUserListCursorScope,
                    availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectMemberService.getMembersList(project, params);

        return {
            data,
            ...others,
        };
    }
}
