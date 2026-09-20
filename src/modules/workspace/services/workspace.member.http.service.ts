import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import {
    WorkspaceMemberDefaultAvailableOrderBy,
    WorkspaceMemberDefaultRole,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberHttpService {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<void> {
        await this.workspaceMemberDomain.transferOwnership(
            workspaceId,
            actorMember,
            targetUserId
        );
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        await this.workspaceMemberDomain.leaveWorkspace(workspaceId, member);
    }

    async getMembersList(
        workspaceId: string,
        query: WorkspaceMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.WorkspaceMemberWhereInput>(
                query,
                {
                    availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                }
            );
        const role = this.paginationQueryUtil.inEnum(
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
            await this.workspaceMemberDomain.getMembersList(
                workspaceId,
                params,
                role?.where
            );

        return {
            data,
            ...others,
        };
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.workspaceMemberDomain.updateMemberRole(
            workspaceId,
            actorMember,
            targetMemberId,
            role
        );
    }

    async removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void> {
        await this.workspaceMemberDomain.removeMember(
            workspaceId,
            actorMember,
            targetMemberId
        );
    }

    async getMembersListForAdmin(
        workspaceId: string,
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                {
                    availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersListForAdmin(
                workspaceId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
