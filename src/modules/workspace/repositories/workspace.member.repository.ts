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
import { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { RoleSelect } from '@modules/role/constants/role.constant';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import {
    WorkspaceActiveFilter,
    WorkspaceMemberGuardRoleInclude,
    WorkspaceMemberRoleInclude,
} from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithGuardRole,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceMemberRepository } from '@modules/workspace/interfaces/workspace.member-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberRepository implements IWorkspaceMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    /** Extra caller-supplied constraint, AND-composed first. */
    private buildWorkspaceScopedWhere(
        workspaceId: string,
        filters: Prisma.WorkspaceMemberWhereInput | undefined,
        role: Record<string, IPaginationIn> | undefined,
        additionalWhere: Prisma.WorkspaceMemberWhereInput
    ): Prisma.WorkspaceMemberWhereInput {
        const roleKeys = role?.role?.in;
        const roleFilter: Prisma.WorkspaceMemberWhereInput = roleKeys
            ? {
                  role: {
                      scope: EnumRoleScope.workspace,
                      key: { in: roleKeys },
                  },
              }
            : {};

        return {
            AND: [additionalWhere, filters ?? {}, roleFilter, { workspaceId }],
        };
    }

    async findOneWithRoleByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<IWorkspaceMemberWithGuardRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
            include: WorkspaceMemberGuardRoleInclude,
        });
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

    async findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                AND: [{ id: workspaceMemberId }, { workspaceId }],
            },
            include: WorkspaceMemberRoleInclude,
        });
    }

    async countOwnedActiveByUser(userId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                userId,
                role: {
                    scope: EnumRoleScope.workspace,
                    key: EnumRoleWorkspaceKey.owner,
                },
                workspace: WorkspaceActiveFilter,
            },
        });
    }

    async countOwners(workspaceId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                workspaceId,
                role: {
                    scope: EnumRoleScope.workspace,
                    key: EnumRoleWorkspaceKey.owner,
                },
            },
        });
    }

    async findReviewersByWorkspace(
        workspaceId: string
    ): Promise<{ userId: string }[]> {
        return this.databaseService.client.workspaceMember.findMany({
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
    }

    /** Extra caller-supplied constraint, AND-composed first. */
    async findWithPaginationOffset(
        workspaceId: string,
        {
            where: filters,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        additionalWhere: Prisma.WorkspaceMemberWhereInput
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            filters,
            undefined,
            additionalWhere
        );

        return this.paginationService.offset<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: scopedWhere,
            include: {
                user: {
                    select: UserRefSelect,
                },
                role: {
                    select: RoleSelect,
                },
            },
        });
    }

    /** Extra caller-supplied constraint, AND-composed first. */
    async findWithPaginationCursor(
        workspaceId: string,
        {
            where: filters,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role: Record<string, IPaginationIn> | undefined,
        additionalWhere: Prisma.WorkspaceMemberWhereInput
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            filters,
            role,
            additionalWhere
        );

        return this.paginationService.cursor<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: scopedWhere,
            include: {
                user: {
                    select: UserRefSelect,
                },
                role: {
                    select: RoleSelect,
                },
            },
        });
    }

    async createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                roleId,
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        roleId: string,
        actorId: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                roleId,
                createdBy: actorId,
                updatedBy: actorId,
            },
        });
    }

    async updateRole(
        targetMemberId: string,
        roleId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.withTransaction(async tx => {
            const { count } = await tx.workspaceMember.updateMany({
                where: { id: targetMemberId },
                data: {
                    roleId,
                },
            });
            if (count === 0) {
                return null;
            }

            return tx.workspaceMember.findUnique({
                where: { id: targetMemberId },
            });
        });
    }

    async removeMember(
        targetMemberId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.withTransaction(async tx => {
            const where: Prisma.WorkspaceMemberWhereInput = {
                id: targetMemberId,
            };
            const existing = await tx.workspaceMember.findFirst({ where });
            if (!existing) {
                return null;
            }

            const { count } = await tx.workspaceMember.deleteMany({ where });

            return count > 0 ? existing : null;
        });
    }

    /** Swaps the owner and admin roles in one transaction. */
    async transferOwnership(
        fromMemberId: string,
        toMemberId: string,
        ownerRoleId: string,
        adminRoleId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.withTransaction(async tx => {
            const { count } = await tx.workspaceMember.updateMany({
                where: { id: fromMemberId },
                data: {
                    roleId: adminRoleId,
                },
            });
            if (count === 0) {
                return null;
            }

            return tx.workspaceMember.update({
                where: { id: toMemberId },
                data: {
                    roleId: ownerRoleId,
                },
            });
        });
    }
}
