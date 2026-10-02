import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';

export interface IProjectMemberRepository {
    findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<ProjectMember | null>;
    findOneWithRoleByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<IProjectMemberWithRole | null>;
    findByIdAndProject(
        projectMemberId: string,
        projectId: string,
        where?: Prisma.ProjectMemberWhereInput
    ): Promise<IProjectMemberWithRole | null>;
    countAdmins(projectId: string): Promise<number>;
    findWithPaginationCursor(
        projectId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IProjectMember>>;
    create(
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember>;
    createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember>;
    updateRole(targetMemberId: string, roleId: string): Promise<void>;
    removeMember(targetMemberId: string): Promise<void>;
}
