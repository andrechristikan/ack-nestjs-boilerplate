import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';

export interface IProjectRepository {
    findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null>;
    findByIdForAdmin(projectId: string): Promise<Project | null>;
    existsBySlugInWorkspace(
        workspaceId: string,
        slug: string,
        excludeProjectId?: string
    ): Promise<boolean>;
    findWithPaginationCursorForWorkspace(
        workspaceId: string,
        memberUserId: string | null,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>>;
    findWithPaginationOffsetForAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: ProjectCreateRequestDto,
        slug: string
    ): Promise<Project>;
    updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<Project>;
    updateSlugInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        slug: string
    ): Promise<Project>;
    softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        deletedAt: Date
    ): Promise<void>;
    softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date
    ): Promise<void>;
}
