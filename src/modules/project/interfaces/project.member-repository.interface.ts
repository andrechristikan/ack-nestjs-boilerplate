import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole, Prisma } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';

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
    create(
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember>;
    createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember>;
    updateRole(
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void>;
    removeMember(targetMemberId: string): Promise<void>;
}
