import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import {
    WorkspaceMemberRefSelect,
    WorkspaceMemberWithUserInclude,
    WorkspaceMemberWithUserRecipientInclude,
    WorkspaceMemberWithUserStateInclude,
} from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithEmail,
    IWorkspaceOwnedUser,
    IWorkspaceTransferMember,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import type { IWorkspaceMemberRepository } from '@modules/workspace/interfaces/workspace.member-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberRepository implements IWorkspaceMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService
    ) {}

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        where: Prisma.WorkspaceMemberWhereInput | null,
        role: Record<string, IPaginationIn> | null
    ): Prisma.WorkspaceMemberWhereInput {
        return {
            ...where,
            ...(role ?? {}),
            workspaceId,
        };
    }

    async findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
        });
    }

    async findOneByWorkspaceAndUserWithUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceTransferMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
            include: WorkspaceMemberWithUserStateInclude,
        });
    }

    async existsActiveByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<boolean> {
        const member =
            await this.databaseService.client.workspaceMember.findFirst({
                where: {
                    workspaceId,
                    userId,
                    workspace: { is: { deletedAt: null } },
                },
                select: WorkspaceMemberRefSelect,
            });

        return member !== null;
    }

    async findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<IWorkspaceMemberWithEmail | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                id: workspaceMemberId,
                workspaceId,
            },
            include: WorkspaceMemberWithUserRecipientInclude,
        });
    }

    async findWorkspaceIdsByUser(userId: string): Promise<string[]> {
        const members =
            await this.databaseService.client.workspaceMember.findMany({
                where: { userId },
                select: WorkspaceMemberRefSelect,
            });

        return members.map(member => member.workspaceId);
    }

    async findLiveOwnedWorkspaceIdsByUser(userId: string): Promise<string[]> {
        const members =
            await this.databaseService.client.workspaceMember.findMany({
                where: {
                    userId,
                    role: EnumWorkspaceMemberRole.owner,
                    workspace: { is: { deletedAt: null } },
                },
                select: WorkspaceMemberRefSelect,
            });

        return members.map(member => member.workspaceId);
    }

    async countOwnedActiveByUser(userId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                userId,
                role: EnumWorkspaceMemberRole.owner,
                workspace: { is: { deletedAt: null } },
            },
        });
    }

    async findWithPaginationOffset(
        workspaceId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        role: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            role
        );

        return this.paginationService.offset(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: WorkspaceMemberWithUserInclude,
            }
        );
    }

    async findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        role: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            role
        );

        return this.paginationService.cursor(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: WorkspaceMemberWithUserInclude,
            }
        );
    }

    async createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                role: EnumWorkspaceMemberRole.owner,
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async createOwnersInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void> {
        await tx.workspaceMember.createMany({
            data: users.map(({ userId, workspaceId }) => ({
                workspaceId,
                userId,
                role: EnumWorkspaceMemberRole.owner,
                createdBy: userId,
                updatedBy: userId,
            })),
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember> {
        try {
            return await tx.workspaceMember.create({
                data: {
                    workspaceId,
                    userId,
                    role,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: 'userId',
                        exception: new WorkspaceMemberAlreadyExistsException(),
                    },
                ],
                new WorkspaceMemberAlreadyExistsException()
            );
        }
    }

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumWorkspaceMemberRole,
        newRole: EnumWorkspaceMemberRole
    ): Promise<WorkspaceMember> {
        try {
            return await tx.workspaceMember.update({
                where: { id: targetMemberId, role: expectedRole },
                data: {
                    role: newRole,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceMemberPeerForbiddenException()
            );
        }
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumWorkspaceMemberRole
    ): Promise<IWorkspaceMemberWithEmail> {
        try {
            return await tx.workspaceMember.delete({
                where: { id: targetMemberId, role: expectedRole },
                include: WorkspaceMemberWithUserRecipientInclude,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceMemberNotFoundException()
            );
        }
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        const { count } = await tx.workspaceMember.deleteMany({
            where: { userId },
        });

        return count;
    }

    async promoteToOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string
    ): Promise<WorkspaceMember> {
        try {
            return await tx.workspaceMember.update({
                where: {
                    id: toMemberId,
                    workspaceId,
                    role: { not: EnumWorkspaceMemberRole.owner },
                    workspace: {
                        members: {
                            some: {
                                id: fromMemberId,
                                role: EnumWorkspaceMemberRole.owner,
                            },
                        },
                    },
                },
                data: {
                    role: EnumWorkspaceMemberRole.owner,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceMemberPeerForbiddenException()
            );
        }
    }

    async demoteOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string
    ): Promise<WorkspaceMember> {
        try {
            return await tx.workspaceMember.update({
                where: {
                    id: fromMemberId,
                    workspaceId,
                    role: EnumWorkspaceMemberRole.owner,
                },
                data: {
                    role: EnumWorkspaceMemberRole.admin,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceMemberPeerForbiddenException()
            );
        }
    }
}
