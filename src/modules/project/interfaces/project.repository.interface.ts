import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Project } from '@generated/prisma-client';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';

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
        actorId: string,
        { name, description }: ProjectCreateRequestDto,
        slug: string
    ): Promise<Project>;
    updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<Project>;
    updateSlugInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        slug: string
    ): Promise<Project>;
    softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        deletedAt: Date
    ): Promise<void>;
    softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string,
        deletedAt: Date
    ): Promise<void>;
}
