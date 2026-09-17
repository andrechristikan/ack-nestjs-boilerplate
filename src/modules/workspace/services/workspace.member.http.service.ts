import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberHttpService {
    constructor(
        private readonly workspaceMemberDomain: WorkspaceMemberDomain
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
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersList(
                workspaceId,
                pagination,
                role
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
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        const { data, ...others } =
            await this.workspaceMemberDomain.getMembersListForAdmin(
                workspaceId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }
}
