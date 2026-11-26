import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { WorkspaceDatabaseErrorContract } from '@modules/workspace/contracts/workspace.database-error.contract';
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
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { Prisma, Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceMemberRefSelect,
    WorkspaceMemberWithUserStateInclude,
    WorkspaceRefSelect,
} from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
    IWorkspaceWithJoinMembers,
    IWorkspaceWithMembers,
    IWorkspaceWithTransferMembers,
} from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceRepository } from '@modules/workspace/interfaces/workspace.repository.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceRepository
    extends DatabaseRepositoryBase
    implements IWorkspaceRepository
{
    private readonly deletedSlugPattern: string;

    protected override readonly errorContract = WorkspaceDatabaseErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        super();

        this.deletedSlugPattern = this.configService.get<string>(
            'workspace.deletedSlugPattern'
        )!;
    }

    private memberInclude(userId: string): {
        members: { where: Prisma.WorkspaceMemberWhereInput; take: 1 };
    } {
        return {
            members: { where: { userId }, take: 1 },
        };
    }

    private joinMembersInclude(userId: string): {
        members: {
            where: Prisma.WorkspaceMemberWhereInput;
            select: typeof WorkspaceMemberRefSelect;
        };
    } {
        return {
            members: {
                where: {
                    OR: [
                        { userId },
                        {
                            role: {
                                in: [
                                    EnumWorkspaceMemberRole.owner,
                                    EnumWorkspaceMemberRole.admin,
                                ],
                            },
                        },
                    ],
                },
                select: WorkspaceMemberRefSelect,
            },
        };
    }

    private transferMembersInclude(targetUserId: string): {
        members: {
            where: Prisma.WorkspaceMemberWhereInput;
            include: typeof WorkspaceMemberWithUserStateInclude;
        };
    } {
        return {
            members: {
                where: {
                    OR: [
                        { role: EnumWorkspaceMemberRole.owner },
                        { userId: targetUserId },
                    ],
                },
                include: WorkspaceMemberWithUserStateInclude,
            },
        };
    }

    async findActiveByIdWithMember(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceWithMembers | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValidId) {
            return null;
        }

        const include = this.memberInclude(userId);

        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
            include,
        });
    }

    async findActiveByIdWithJoinMembers(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceWithJoinMembers | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValidId) {
            return null;
        }

        const include = this.joinMembersInclude(userId);

        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
            include,
        });
    }

    async findActiveByIdWithTransferMembers(
        workspaceId: string,
        targetUserId: string
    ): Promise<IWorkspaceWithTransferMembers | null> {
        const isValidId = this.databaseUtil.checkIdIsValid(workspaceId);
        if (!isValidId) {
            return null;
        }

        const include = this.transferMembersInclude(targetUserId);

        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                deletedAt: null,
            },
            include,
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
                        { deletedAt: null },
                        { id: { in: workspaceIds } },
                    ],
                },
            }
        );
    }

    async findWithPaginationOffsetByAdmin(
        { where, ...others }: IPaginationQueryOffsetParams,
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
        try {
            return await tx.workspace.create({
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
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void> {
        try {
            await tx.workspace.createMany({
                data: users.map(({ userId, workspaceId, name, slug }) => ({
                    id: workspaceId,
                    name,
                    slug,
                    description: null,
                    isPublic: false,
                    createdBy: userId,
                    deletedAt: null,
                })),
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
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
        try {
            return await tx.workspace.update({
                where: { id: workspaceId },
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
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): Promise<string> {
        const deletedSlugPattern = this.deletedSlugPattern;
        try {
            const workspace = await tx.workspace.update({
                where: {
                    id: workspaceId,
                    deletedAt: null,
                },
                data: {
                    slug: deletedSlugPattern.replace('{id}', () => workspaceId),
                    deletedAt,
                    deletedBy,
                    updatedBy: deletedBy,
                },
                select: WorkspaceRefSelect,
            });

            return workspace.id;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async existsOwnedWithOtherMembers(
        workspaceIds: string[],
        userId: string
    ): Promise<boolean> {
        const workspace = await this.databaseService.client.workspace.findFirst(
            {
                where: {
                    id: { in: workspaceIds },
                    deletedAt: null,
                    members: { some: { userId: { not: userId } } },
                },
                select: WorkspaceRefSelect,
            }
        );

        return workspace !== null;
    }
}
