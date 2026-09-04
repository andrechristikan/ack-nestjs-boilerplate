import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, WorkspaceMember } from '@generated/prisma-client';
import { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { IWorkspaceMemberHttpService } from '@modules/workspace/interfaces/workspace.member.http.service.interface';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberHttpService implements IWorkspaceMemberHttpService {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceUtil: WorkspaceUtil
    ) {}

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        { targetUserId }: WorkspaceTransferOwnershipRequestDto
    ): Promise<void> {
        await this.workspaceMemberService.transferOwnership(
            workspaceId,
            actorMember,
            targetUserId
        );
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        await this.workspaceMemberService.leaveWorkspace(workspaceId, member);
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        const { data, ...others } =
            await this.workspaceMemberService.getMembersList(
                workspaceId,
                pagination,
                role
            );

        return {
            data: this.workspaceUtil.mapMemberList(data),
            ...others,
        };
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        { role }: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void> {
        await this.workspaceMemberService.updateMemberRole(
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
        await this.workspaceMemberService.removeMember(
            workspaceId,
            actorMember,
            targetMemberId
        );
    }

    async getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        const { data, ...others } =
            await this.workspaceMemberService.getMembersListForAdmin(
                workspaceId,
                pagination
            );

        return {
            data: this.workspaceUtil.mapMemberList(data),
            ...others,
        };
    }
}
