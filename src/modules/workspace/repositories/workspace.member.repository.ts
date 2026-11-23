import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { RoleRefSelect } from '@modules/role/constants/role.constant';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceMemberRepository } from '@modules/workspace/interfaces/workspace.member-repository.interface';
import { WorkspaceMemberRoleInclude } from '@modules/workspace/constants/workspace.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberRepository implements IWorkspaceMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        where: Prisma.WorkspaceMemberWhereInput | null,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Prisma.WorkspaceMemberWhereInput {
        return {
            AND: [
                additionalWhere ?? {},
                where ?? {},
                roleKey === null
                    ? {}
                    : { role: { scope: EnumRoleScope.workspace, ...roleKey } },
                { workspaceId },
            ],
        };
    }

    async findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async findOneOwnerByWorkspace(
        workspaceId: string
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                role: {
                    scope: EnumRoleScope.workspace,
                    key: EnumRoleWorkspaceKey.owner,
                },
                workspace: WorkspaceActiveFilter,
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                AND: [additionalWhere ?? {}],
                id: workspaceMemberId,
                workspaceId,
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async findReviewerUserIdsByWorkspace(
        workspaceId: string
    ): Promise<string[]> {
        const reviewers =
            await this.databaseService.client.workspaceMember.findMany({
                where: {
                    workspaceId,
                    role: {
                        scope: EnumRoleScope.workspace,
                        key: {
                            in: [
                                EnumRoleWorkspaceKey.owner,
                                EnumRoleWorkspaceKey.admin,
                            ],
                        },
                    },
                },
                select: { userId: true },
            });

        return reviewers.map(reviewer => reviewer.userId);
    }

    async findWorkspaceIdsByUser(
        userId: string,
        role: EnumRoleWorkspaceKey | null
    ): Promise<string[]> {
        const members =
            await this.databaseService.client.workspaceMember.findMany({
                where: {
                    userId,
                    ...(role !== null && {
                        role: { scope: EnumRoleScope.workspace, key: role },
                    }),
                },
                select: { workspaceId: true },
            });

        return members.map(member => member.workspaceId);
    }

    async findWorkspaceIdsByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        role: EnumRoleWorkspaceKey | null
    ): Promise<string[]> {
        const members = await tx.workspaceMember.findMany({
            where: {
                userId,
                ...(role !== null && {
                    role: { scope: EnumRoleScope.workspace, key: role },
                }),
            },
            select: { workspaceId: true },
        });

        return members.map(member => member.workspaceId);
    }

    async findWithPaginationOffset(
        workspaceId: string,
        { where, ...others }: IPaginationQueryOffsetParams,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            roleKey,
            additionalWhere
        );

        return this.paginationService.offset(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                    role: { select: RoleRefSelect },
                },
            }
        );
    }

    async findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        roleKey: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.WorkspaceMemberWhereInput | null
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            roleKey,
            additionalWhere
        );

        return this.paginationService.cursor(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                    role: { select: RoleRefSelect },
                },
            }
        );
    }

    async createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        ownerRoleId: string
    ): Promise<IWorkspaceMemberWithRole> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                roleId: ownerRoleId,
                createdBy: userId,
                updatedBy: userId,
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string,
        actorId: string
    ): Promise<IWorkspaceMemberWithRole> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                roleId,
                createdBy: actorId,
                updatedBy: actorId,
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string,
        newRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.workspaceMember.updateMany({
            where: { id: targetMemberId, roleId: expectedRoleId },
            data: {
                roleId: newRoleId,
            },
        });

        return count > 0;
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.workspaceMember.deleteMany({
            where: { id: targetMemberId, roleId: expectedRoleId },
        });

        return count > 0;
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
        toMemberId: string,
        ownerRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.workspaceMember.updateMany({
            where: {
                id: toMemberId,
                workspaceId,
                role: {
                    scope: EnumRoleScope.workspace,
                    key: { not: EnumRoleWorkspaceKey.owner },
                },
                workspace: {
                    members: {
                        some: {
                            id: fromMemberId,
                            roleId: ownerRoleId,
                        },
                    },
                },
            },
            data: {
                roleId: ownerRoleId,
            },
        });

        return count > 0;
    }

    async demoteOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        fromMemberId: string,
        ownerRoleId: string,
        adminRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.workspaceMember.updateMany({
            where: {
                id: fromMemberId,
                workspaceId,
                roleId: ownerRoleId,
            },
            data: {
                roleId: adminRoleId,
            },
        });

        return count > 0;
    }
}
