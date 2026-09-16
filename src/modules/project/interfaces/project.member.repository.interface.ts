import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    Prisma,
    ProjectMember,
} from '@generated/prisma-client';
import { IProjectMember } from '@modules/project/interfaces/project.interface';

export interface IProjectMemberRepository {
    findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<ProjectMember | null>;
    findByIdAndProject(
        projectMemberId: string,
        projectId: string
    ): Promise<ProjectMember | null>;
    findWithPaginationCursor(
        projectId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember>;
    updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        newRole: EnumProjectMemberRole,
        actorId: string
    ): Promise<void>;
    removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string
    ): Promise<void>;
}
