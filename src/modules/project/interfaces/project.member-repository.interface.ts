import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import type { EnumRoleProjectKey } from '@modules/role/enums/role.enum';

export interface IProjectMemberRepository {
    findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<IProjectMemberWithRole | null>;
    findByIdAndProject(
        projectMemberId: string,
        projectId: string,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<IProjectMemberWithRole | null>;
    findWithPaginationCursor(
        projectId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IProjectMember>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string,
        newRoleId: string
    ): Promise<boolean>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string
    ): Promise<boolean>;
    countByProjectAndRoleKey(
        projectId: string,
        key: EnumRoleProjectKey
    ): Promise<number>;
    removeByIdInTx(
        tx: IDatabaseTransactionClient,
        memberId: string
    ): Promise<boolean>;
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
