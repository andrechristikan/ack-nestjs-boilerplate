import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import type { IProjectRepository } from '@modules/project/interfaces/project.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectRepository implements IProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
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
    ): Promise<IResponsePaginationReturn<Project>> {
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
    ): Promise<IResponsePaginationReturn<Project>> {
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

    async create(
        workspaceId: string,
        { name, description }: ProjectCreateRequestDto,
        slugCandidates: string[]
    ): Promise<Project> {
        for (const slug of slugCandidates) {
            try {
                return await this.databaseService.client.project.create({
                    data: {
                        workspaceId,
                        name,
                        slug,
                        description,
                        deletedAt: null,
                    },
                });
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    throw error;
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async updateDetails(
        projectId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<Project> {
        return this.databaseService.client.project.update({
            where: { id: projectId },
            data: {
                name,
                description,
            },
        });
    }

    async updateSlug(projectId: string, slug: string): Promise<Project> {
        return this.databaseService.client.project.update({
            where: { id: projectId },
            data: {
                slug,
            },
        });
    }

    async softDelete(projectId: string, deletedAt: Date): Promise<void> {
        await this.databaseService.client.project.softDelete({
            where: { id: projectId },
            data: {
                deletedAt,
            },
        });
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        await tx.project.updateMany({
            where: {
                workspaceId,
                ...ProjectActiveFilter,
            },
            data: {
                deletedAt,
                deletedBy,
            },
        });
    }
}
