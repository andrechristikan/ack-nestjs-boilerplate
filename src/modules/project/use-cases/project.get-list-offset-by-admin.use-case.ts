import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
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
    [IPolicyContext, ProjectAdminListRequestDto],
    IResponsePaginationReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectDefaultAvailableOrderBy,
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
                workspaceFilter?.where ?? null,
                additionalWhere
            );

        return {
            data,
            ...others,
        };
    }
}
