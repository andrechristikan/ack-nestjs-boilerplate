import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Project } from '@generated/prisma-client';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { IProjectRepository } from '@modules/project/interfaces/project.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectRepository implements IProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        return this.databaseService.client.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
                ...ProjectActiveFilter,
            },
        });
    }

    async findByIdForAdmin(projectId: string): Promise<Project | null> {
        return this.databaseService.client.project.findUnique({
            where: { id: projectId },
        });
    }

    /** Counts slug holders across ALL rows including soft-deleted ones, matching the unique index, which has no `deletedAt` component. */
    async existsBySlugInWorkspace(
        workspaceId: string,
        slug: string,
        excludeProjectId?: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.project.count({
            where: {
                workspaceId,
                slug,
                ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
            },
        });

        return count > 0;
    }

    async findWithPaginationCursorForWorkspace(
        workspaceId: string,
        memberUserId: string | null,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectWhereInput>
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.cursor<Project, Prisma.ProjectWhereInput>(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    AND: [
                        where ?? {},
                        { workspaceId },
                        ProjectActiveFilter,
                        ...(memberUserId
                            ? [{ members: { some: { userId: memberUserId } } }]
                            : []),
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetForAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.offset<Project, Prisma.ProjectWhereInput>(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    ...where,
                    ...(workspaceId ? { workspaceId } : {}),
                },
            }
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto,
        slug: string
    ): Promise<Project> {
        return tx.project.create({
            data: {
                workspaceId,
                name,
                slug,
                description,
                createdBy: actorId,
                deletedAt: null,
            },
        });
    }

    async updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<Project> {
        return tx.project.update({
            where: { id: projectId },
            data: {
                name,
                description,
                updatedBy: actorId,
            },
        });
    }

    async updateSlugInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        slug: string
    ): Promise<Project> {
        return tx.project.update({
            where: { id: projectId },
            data: {
                slug,
                updatedBy: actorId,
            },
        });
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        actorId: string,
        deletedAt: Date
    ): Promise<void> {
        await tx.project.update({
            where: { id: projectId },
            data: {
                deletedAt,
                updatedBy: actorId,
            },
        });
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorId: string,
        deletedAt: Date
    ): Promise<void> {
        await tx.project.updateMany({
            where: {
                workspaceId,
                ...ProjectActiveFilter,
            },
            data: {
                deletedAt,
                updatedBy: actorId,
            },
        });
    }
}
