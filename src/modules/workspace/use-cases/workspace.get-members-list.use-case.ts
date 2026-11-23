import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
    WorkspaceMemberUserListCursorScope,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type {
    IWorkspaceContext,
    IWorkspaceMember,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetMembersListUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext, WorkspaceMemberListRequestDto],
    IResponsePaginationReturn<IWorkspaceMember>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.WorkspaceMember
        );
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: WorkspaceMemberUserListCursorScope,
            availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
        });
        const roleKey = this.paginationFilterUtil.inEnum(
            Prisma.RoleScalarFieldEnum.key,
            query.role,
            WorkspaceMemberDefaultRole
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(roleKey?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceMemberService.getMembersList(
                workspaceContext.workspace.id,
                params,
                roleKey?.where ?? null,
                additionalWhere
            );

        return {
            data,
            ...others,
        };
    }
}
