import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceGetMembersListByAdminUseCase implements IAppUseCase<
    [string, WorkspaceAdminMemberListRequestDto],
    IResponsePaginationReturn<IWorkspaceMember>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        workspaceId: string,
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                { availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceMemberService.getMembersListByAdmin(
                workspaceId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
