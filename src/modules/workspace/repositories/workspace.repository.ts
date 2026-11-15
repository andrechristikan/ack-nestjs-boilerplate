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
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceDeletedSlugPattern } from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceCreate,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceRepository } from '@modules/workspace/interfaces/workspace.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceRepository implements IWorkspaceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findActiveById(workspaceId: string): Promise<Workspace | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValidId) {
            return null;
        }

        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
        });
    }

    async findActivePublicBySlug(slug: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                slug,
                isPublic: true,
                deletedAt: null,
            },
        });
    }

    async findByIdByAdmin(workspaceId: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findUnique({
            where: { id: workspaceId },
        });
    }

    async countByOwnerInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return tx.workspace.count({
            where: {
                deletedAt: null,
                members: {
                    some: { userId, role: EnumWorkspaceMemberRole.owner },
                },
            },
        });
    }

    async findWithPaginationCursorByMember(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IPaginationCursorReturn<Workspace>> {
        return this.paginationService.cursor(
            this.databaseService.client.workspace,
            {
                ...others,
                where: {
                    AND: [
                        where ?? {},
                        { deletedAt: null },
                        { members: { some: { userId } } },
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetByAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic: Record<string, IPaginationEqual> | null
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.paginationService.offset(
            this.databaseService.client.workspace,
            {
                ...others,
                where: {
                    ...where,
                    ...isPublic,
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
        const { count } = await tx.workspace.updateMany({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
            data: {
                slug: WorkspaceDeletedSlugPattern.replace(
                    '{id}',
                    () => workspaceId
                ),
                deletedAt,
                deletedBy,
            },
        });

        return count > 0;
    }

    async existsOwnedWithOtherMembersInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<boolean> {
        const workspace = await tx.workspace.findFirst({
            where: {
                deletedAt: null,
                AND: [
                    {
                        members: {
                            some: {
                                userId,
                                role: EnumWorkspaceMemberRole.owner,
                            },
                        },
                    },
                    { members: { some: { userId: { not: userId } } } },
                ],
            },
            select: { id: true },
        });

        return workspace !== null;
    }

    async softDeleteOwnedByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<string[]> {
        const where: Prisma.WorkspaceWhereInput = {
            deletedAt: null,
            members: {
                some: { userId, role: EnumWorkspaceMemberRole.owner },
            },
        };
        const workspaces = await tx.workspace.findMany({
            where,
            select: { id: true },
        });
        const workspaceIds = workspaces.map(({ id }) => id);

        for (const workspaceId of workspaceIds) {
            await tx.workspace.updateMany({
                where: { id: workspaceId, deletedAt: null },
                data: {
                    slug: WorkspaceDeletedSlugPattern.replace(
                        '{id}',
                        () => workspaceId
                    ),
                    deletedAt,
                    deletedBy: userId,
                },
            });
        }

        return workspaceIds;
    }
}
