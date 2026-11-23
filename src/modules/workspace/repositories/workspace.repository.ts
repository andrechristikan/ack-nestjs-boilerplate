import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import type {
    IWorkspaceCreate,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceRepository } from '@modules/workspace/interfaces/workspace.repository.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceRepository implements IWorkspaceRepository {
    private readonly deletedSlugPattern: string;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.deletedSlugPattern = this.configService.get<string>(
            'workspace.deletedSlugPattern'
        )!;
    }

    async findActiveById(workspaceId: string): Promise<Workspace | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValidId) {
            return null;
        }

        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findActivePublicBySlug(slug: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                slug,
                isPublic: true,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findByIdByAdmin(
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceWhereInput | null
    ): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: { AND: [additionalWhere ?? {}, { id: workspaceId }] },
        });
    }

    async countByOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[]
    ): Promise<number> {
        return tx.workspace.count({
            where: {
                id: { in: workspaceIds },
                deletedAt: null,
            },
        });
    }

    async findWithPaginationCursorByMember(
        workspaceIds: string[],
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<Workspace>> {
        return this.paginationService.cursor(
            this.databaseService.client.workspace,
            {
                ...others,
                where: {
                    AND: [
                        where ?? {},
                        WorkspaceActiveFilter,
                        { id: { in: workspaceIds } },
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetByAdmin(
        { where, ...others }: IPaginationQueryOffsetParams,
        isPublic: Record<string, IPaginationEqual> | null,
        additionalWhere: Prisma.WorkspaceWhereInput | null
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.paginationService.offset(
            this.databaseService.client.workspace,
            {
                ...others,
                where: {
                    AND: [additionalWhere ?? {}, where ?? {}, isPublic ?? {}],
                },
            }
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        { name, description, isPublic }: IWorkspaceCreate,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        return tx.workspace.create({
            data: {
                id: workspaceId,
                name,
                slug,
                description,
                isPublic: isPublic ?? false,
                createdBy: ownerId,
                deletedAt: null,
            },
        });
    }

    async updateDetailsInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        { name, description }: IWorkspaceUpdate
    ): Promise<Workspace> {
        return tx.workspace.update({
            where: { id: workspaceId },
            data: { name, description },
        });
    }

    async updateIsPublicInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        return tx.workspace.update({
            where: { id: workspaceId },
            data: {
                isPublic,
            },
        });
    }

    async updateSlugInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        slug: string
    ): Promise<Workspace> {
        return tx.workspace.update({
            where: { id: workspaceId },
            data: {
                slug,
            },
        });
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<boolean> {
        const deletedSlugPattern = this.deletedSlugPattern;
        const { count } = await tx.workspace.updateMany({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
            data: {
                slug: deletedSlugPattern.replace('{id}', () => workspaceId),
                deletedAt,
                deletedBy,
            },
        });

        return count > 0;
    }

    async existsOwnedWithOtherMembersInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        userId: string
    ): Promise<boolean> {
        const workspace = await tx.workspace.findFirst({
            where: {
                id: { in: workspaceIds },
                deletedAt: null,
                members: { some: { userId: { not: userId } } },
            },
            select: { id: true },
        });

        return workspace !== null;
    }

    async softDeleteOwnedByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        userId: string,
        deletedAt: Date
    ): Promise<string[]> {
        const where: Prisma.WorkspaceWhereInput = {
            id: { in: workspaceIds },
            deletedAt: null,
        };
        const workspaces = await tx.workspace.findMany({
            where,
            select: { id: true },
        });
        const liveWorkspaceIds = workspaces.map(({ id }) => id);

        const deletedSlugPattern = this.deletedSlugPattern;
        for (const workspaceId of liveWorkspaceIds) {
            await tx.workspace.updateMany({
                where: { id: workspaceId, deletedAt: null },
                data: {
                    slug: deletedSlugPattern.replace('{id}', () => workspaceId),
                    deletedAt,
                    deletedBy: userId,
                },
            });
        }

        return liveWorkspaceIds;
    }
}
