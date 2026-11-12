import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';

export interface IProjectRepository {
    findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null>;
    findByIdByAdmin(projectId: string): Promise<Project | null>;
    findWithPaginationCursorForWorkspace(
        workspaceId: string,
        memberUserId: string | null,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePaginationReturn<Project>>;
    findWithPaginationOffsetByAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId: string | null
    ): Promise<IResponsePaginationReturn<Project>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: IProjectCreate,
        slug: string
    ): Promise<Project>;
    updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        { name, description }: IProjectUpdate
    ): Promise<Project>;
    updateSlugInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        slug: string
    ): Promise<Project>;
    softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<boolean>;
    softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void>;
}
