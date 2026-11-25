import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';

export interface IProjectMemberRepository {
    findByIdAndProject(
        projectMemberId: string,
        projectId: string
    ): Promise<ProjectMember | null>;
    findWithPaginationCursor(
        projectId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IProjectMember>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<void>;
    createWithUserInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole,
        newRole: EnumProjectMemberRole
    ): Promise<ProjectMember>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole
    ): Promise<ProjectMember>;
    removeByIdInTx(
        tx: IDatabaseTransactionClient,
        memberId: string
    ): Promise<ProjectMember>;
    removeByWorkspaceAndUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number>;
    removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number>;
}
