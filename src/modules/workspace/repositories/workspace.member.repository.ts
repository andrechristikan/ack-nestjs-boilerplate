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
    WorkspaceMemberRoleInclude,
} from '@modules/workspace/constants/workspace.constant';
import type {
    IWorkspaceMember,
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

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        filters?: Prisma.WorkspaceMemberWhereInput,
        role?: Record<string, IPaginationIn>,
        where?: Prisma.WorkspaceMemberWhereInput
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
            AND: [
                filters ?? {},
                ...(where ? [where] : []),
                roleFilter,
                { workspaceId },
            ],
        };
    }

    async findOneWithRoleByWorkspaceAndUser(
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
        workspaceId: string,
        where?: Prisma.WorkspaceMemberWhereInput
    ): Promise<IWorkspaceMemberWithRole | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                AND: [
                    { id: workspaceMemberId },
                    { workspaceId },
                    ...(where ? [where] : []),
                ],
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

    async findWithPaginationOffset(
        workspaceId: string,
        {
            where: filters,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            filters,
            role
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

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where: filters,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>,
        where?: Prisma.WorkspaceMemberWhereInput
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            filters,
            role,
            where
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

    async updateRole(targetMemberId: string, roleId: string): Promise<void> {
        await this.databaseService.client.workspaceMember.update({
            where: { id: targetMemberId },
            data: {
                roleId,
            },
        });
    }

    async removeMember(targetMemberId: string): Promise<void> {
        await this.databaseService.client.workspaceMember.delete({
            where: { id: targetMemberId },
        });
    }

    async transferOwnership(
        fromMemberId: string,
        toMemberId: string,
        ownerRoleId: string,
        adminRoleId: string
    ): Promise<void> {
        await this.databaseService.withTransaction(async tx => {
            await tx.workspaceMember.update({
                where: { id: fromMemberId },
                data: {
                    roleId: adminRoleId,
                },
            });
            await tx.workspaceMember.update({
                where: { id: toMemberId },
                data: {
                    roleId: ownerRoleId,
                },
            });
        });
    }
}
