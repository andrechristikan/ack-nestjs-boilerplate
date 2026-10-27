import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
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
    /** Extra caller-supplied constraint, AND-composed first. */
    findWithPaginationCursorForWorkspace(
        workspaceId: string,
        params: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>,
        additionalWhere: Prisma.ProjectWhereInput
    ): Promise<IResponsePaginationReturn<Project>>;
    /** Extra caller-supplied constraint, AND-composed first. */
    findWithPaginationOffsetForAdmin(
        params: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId: string | undefined,
        additionalWhere: Prisma.ProjectWhereInput
    ): Promise<IResponsePaginationReturn<Project>>;
    createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: ProjectCreateRequestDto,
        slug: string
    ): Promise<Project>;
    updateDetails(
        projectId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<Project | null>;
    updateSlug(projectId: string, slug: string): Promise<Project | null>;
    softDelete(
        projectId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<Project | null>;
    softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void>;
}
