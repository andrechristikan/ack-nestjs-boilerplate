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
import {
    ProjectMemberDefaultAvailableOrderBy,
    ProjectMemberUserListCursorScope,
} from '@modules/project/constants/project.list.constant';
import type { ProjectMemberListRequestDto } from '@modules/project/dtos/request/project.member-list.request.dto';
import type {
    IProjectContext,
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetMembersListUseCase implements IAppUseCase<
    [IProjectContext, IPolicyContext, ProjectMemberListRequestDto],
    IResponsePaginationReturn<IProjectMember>
> {
    constructor(
        private readonly projectMemberService: ProjectMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        projectContext: IProjectContext,
        policyContext: IPolicyContext,
        query: ProjectMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.ProjectMember
        );
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: ProjectMemberUserListCursorScope,
            availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.projectMemberService.getMembersList(
                projectContext.project,
                params,
                additionalWhere
            );

        return {
            data,
            ...others,
        };
    }
}
