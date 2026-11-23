import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class ProjectGetListCursorByMemberUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext, ProjectUserListRequestDto],
    IResponsePaginationReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        query: ProjectUserListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: ProjectUserListCursorScope,
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectCursorAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectService.getListCursorByMember(
                workspaceContext.workspace.id,
                params,
                additionalWhere
            );

        return {
            data,
            ...others,
        };
    }
}
