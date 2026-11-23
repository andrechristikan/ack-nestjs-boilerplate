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
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetMembersListByAdminUseCase implements IAppUseCase<
    [IPolicyContext, string, WorkspaceAdminMemberListRequestDto],
    IResponsePaginationReturn<IWorkspaceMember>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        workspaceId: string,
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.WorkspaceMember
        );
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceMemberService.getMembersListByAdmin(
                workspaceId,
                params,
                additionalWhere
            );

        return {
            data,
            ...others,
        };
    }
}
