import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { ProjectDatabaseErrorContract } from '@modules/project/contracts/project.database-error.contract';
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
import type { Prisma, Project } from '@generated/prisma-client/client';
import { ProjectRefSelect } from '@modules/project/constants/project.constant';
import type {
    IProjectCreate,
    IProjectRef,
    IProjectUpdate,
    IProjectWithMembers,
} from '@modules/project/interfaces/project.interface';
import type { IProjectRepository } from '@modules/project/interfaces/project.repository.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectRepository
    extends DatabaseRepositoryBase
    implements IProjectRepository
{
    private readonly deletedSlugPattern: string;

    protected override readonly errorContract = ProjectDatabaseErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        super();

        this.deletedSlugPattern = this.configService.get<string>(
            'project.deletedSlugPattern'
        )!;
    }

    private memberInclude(userId: string): {
        members: { where: Prisma.ProjectMemberWhereInput; take: 1 };
    } {
        return {
            members: { where: { userId }, take: 1 },
        };
    }

    async findActiveByIdAndWorkspace(
        projectId: string,
        workspaceId: string
    ): Promise<Project | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(projectId);
        if (!isValidId) {
            return null;
        }

        return this.databaseService.client.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
                deletedAt: null,
            },
        });
    }

    async findActiveByIdAndWorkspaceWithMember(
        projectId: string,
        workspaceId: string,
        userId: string
    ): Promise<IProjectWithMembers | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(projectId);
        if (!isValidId) {
            return null;
        }

        const include = this.memberInclude(userId);

        return this.databaseService.client.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
                deletedAt: null,
            },
            include,
        });
    }

    async findByIdByAdmin(projectId: string): Promise<Project | null> {
        return this.databaseService.client.project.findUnique({
            where: { id: projectId },
        });
    }

    async findWithPaginationCursorForWorkspace(
        workspaceId: string,
        memberUserId: string | null,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.paginationService.cursor(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    AND: [
                        where ?? {},
                        { workspaceId },
                        { deletedAt: null },
                        ...(memberUserId
                            ? [{ members: { some: { userId: memberUserId } } }]
                            : []),
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetByAdmin(
        { where, ...others }: IPaginationQueryOffsetParams,
        workspaceFilter: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.paginationService.offset(
            this.databaseService.client.project,
            {
                ...others,
                where: {
                    ...where,
                    ...workspaceFilter,
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
        try {
            return await tx.project.create({
                data: {
                    workspaceId,
                    name,
                    slug,
                    description,
                    deletedAt: null,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
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
        try {
            return await tx.project.update({
                where: { id: projectId },
                data: {
                    slug,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<IProjectRef> {
        const deletedSlugPattern = this.deletedSlugPattern;
        try {
            return await tx.project.update({
                where: {
                    id: projectId,
                    deletedAt: null,
                },
                data: {
                    slug: deletedSlugPattern.replace('{id}', () => projectId),
                    deletedAt,
                    deletedBy,
                },
                select: ProjectRefSelect,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async softDeleteChunkByWorkspaces(
        workspaceIds: string[],
        deletedAt: Date,
        deletedBy: string,
        take: number
    ): Promise<number> {
        const client = this.databaseService.client;
        const projects = await client.project.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                deletedAt: null,
            },
            select: ProjectRefSelect,
            take,
        });

        const deletedSlugPattern = this.deletedSlugPattern;
        await Promise.all(
            projects.map(({ id }) =>
                client.project.updateMany({
                    where: { id, deletedAt: null },
                    data: {
                        slug: deletedSlugPattern.replace('{id}', () => id),
                        deletedAt,
                        deletedBy,
                    },
                })
            )
        );

        return projects.length;
    }
}
