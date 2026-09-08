import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceMember,
} from '@generated/prisma-client';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';

export interface IWorkspaceMemberService {
    validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<WorkspaceMember>;
    validateWorkspaceRoleGuard(
        member: WorkspaceMember | null,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember;
    getOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null>;
    transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void>;
    leaveWorkspace(workspaceId: string, member: WorkspaceMember): Promise<void>;
    getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>>;
    updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void>;
    removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void>;
    getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>>;
}
