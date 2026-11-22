import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
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
    [IWorkspaceContext, WorkspaceMemberListRequestDto],
    IResponsePaginationReturn<IWorkspaceMember>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } = this.paginationQueryUtil.cursor(query, {
            scope: WorkspaceMemberUserListCursorScope,
            availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
        });
        const role = this.paginationFilterUtil.inEnum(
            Prisma.WorkspaceMemberScalarFieldEnum.role,
            query.role,
            WorkspaceMemberDefaultRole
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(role?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.workspaceMemberService.getMembersList(
                workspaceContext.workspace.id,
                params,
                role?.where
            );

        return {
            data,
            ...others,
        };
    }
}
