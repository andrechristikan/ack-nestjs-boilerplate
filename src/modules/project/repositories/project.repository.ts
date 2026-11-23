import type { Prisma } from '@generated/prisma-client/client';
import { ProjectActiveFilter } from '@modules/project/constants/project.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type {
    IProjectCreate,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import type { IProjectRepository } from '@modules/project/interfaces/project.repository.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectRepository implements IProjectRepository {
    private readonly deletedSlugPattern: string;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.deletedSlugPattern = this.configService.get<string>(
            'project.deletedSlugPattern'
        )!;
    }

    async findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<Project | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(projectId);
        if (!isValidId) {
            return null;
        }

        return this.databaseService.client.project.findFirst({
            where: {
                AND: [
                    additionalWhere ?? {},
                    {
                        id: projectId,
                        workspaceId,
                        ...ProjectActiveFilter,
                    },
                ],
            },
        });
    }

    async findByIdByAdmin(
        projectId: string,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<Project | null> {
        return this.databaseService.client.project.findFirst({
            where: { AND: [additionalWhere ?? {}, { id: projectId }] },
        });
    }

    async findWithPaginationCursorForWorkspace(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.paginationService.cursor(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    AND: [
                        additionalWhere ?? {},
                        where ?? {},
                        { workspaceId },
                        ProjectActiveFilter,
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetByAdmin(
        { where, ...others }: IPaginationQueryOffsetParams,
        workspaceFilter: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.ProjectWhereInput | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.paginationService.offset(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    AND: [
                        additionalWhere ?? {},
                        where ?? {},
                        workspaceFilter ?? {},
                    ],
                },
            }
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: IProjectCreate,
        slug: string
    ): Promise<Project> {
        return tx.project.create({
            data: {
                workspaceId,
                name,
                slug,
                description,
                deletedAt: null,
            },
        });
    }

    async updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        { name, description }: IProjectUpdate
    ): Promise<Project> {
        return tx.project.update({
            where: { id: projectId },
            data: { name, description },
        });
    }

    async updateSlugInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        slug: string
    ): Promise<Project> {
        return tx.project.update({
            where: { id: projectId },
            data: {
                slug,
            },
        });
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<boolean> {
        const deletedSlugPattern = this.deletedSlugPattern;
        const { count } = await tx.project.updateMany({
            where: {
                id: projectId,
                deletedAt: null,
            },
            data: {
                slug: deletedSlugPattern.replace('{id}', () => projectId),
                deletedAt,
                deletedBy,
            },
        });

        return count > 0;
    }

    async softDeleteByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<void> {
        const projects = await tx.project.findMany({
            where: {
                workspaceId,
                ...ProjectActiveFilter,
            },
            select: { id: true },
        });

        const deletedSlugPattern = this.deletedSlugPattern;
        for (const { id } of projects) {
            await tx.project.updateMany({
                where: { id, deletedAt: null },
                data: {
                    slug: deletedSlugPattern.replace('{id}', () => id),
                    deletedAt,
                    deletedBy,
                },
            });
        }
    }
}
