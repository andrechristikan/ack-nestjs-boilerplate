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

export interface IWorkspaceMemberHttpService {
    transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        body: WorkspaceTransferOwnershipRequestDto
    ): Promise<void>;
    leaveWorkspace(workspaceId: string, member: WorkspaceMember): Promise<void>;
    getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>>;
    updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        body: WorkspaceMemberUpdateRoleRequestDto
    ): Promise<void>;
    removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void>;
    getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>>;
}
