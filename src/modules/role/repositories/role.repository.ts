import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import {
    RoleRefSelect,
    RoleSelect,
    RoleWithPoliciesInclude,
    RoleWithPolicyCountInclude,
} from '@modules/role/constants/role.constant';
import type {
    IRole,
    IRoleCreate,
    IRoleRef,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import type { IRoleRepository } from '@modules/role/interfaces/role.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleRepository implements IRoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        { where, ...params }: IPaginationQueryOffsetParams,
        scope: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset(this.databaseService.client.role, {
            ...params,
            where: {
                AND: [additionalWhere ?? {}, { ...where, ...scope }],
            },
            include: RoleWithPolicyCountInclude,
        });
    }

    async findWithPaginationCursorByShared(
        { where, ...params }: IPaginationQueryCursorParams,
        scope: EnumRoleScope
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor(this.databaseService.client.role, {
            ...params,
            where: { ...where, scope },
            include: RoleWithPolicyCountInclude,
        });
    }

    async findWithPaginationCursorBySystem(
        { where, ...params }: IPaginationQueryCursorParams,
        scope: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...scope,
            },
            include: RoleWithPolicyCountInclude,
        });
    }

    async findOneWithPoliciesById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies | null> {
        return this.databaseService.client.role.findFirst({
            where: { AND: [additionalWhere ?? {}, { id }] },
            include: RoleWithPoliciesInclude,
        });
    }

    async findOneById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: { AND: [additionalWhere ?? {}, { id }] },
            select: RoleSelect,
        });
    }

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole | null> {
        return tx.role.findFirst({
            where: { AND: [additionalWhere ?? {}, { id }] },
            select: RoleSelect,
        });
    }

    async findOneRefByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef | null> {
        return this.databaseService.client.role.findUnique({
            where: { scope_key: { scope, key } },
            select: RoleRefSelect,
        });
    }

    async findOneRefByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef | null> {
        return tx.role.findUnique({
            where: { scope_key: { scope, key } },
            select: RoleRefSelect,
        });
    }

    async findOneRefById(id: string): Promise<IRoleRef | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            select: RoleRefSelect,
        });
    }

    async findOneByUserId(
        userId: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: {
                users: {
                    some: {
                        AND: [
                            additionalWhere ?? {},
                            { id: userId, deletedAt: null },
                        ],
                    },
                },
            },
            select: RoleSelect,
        });
    }

    async existsById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<boolean> {
        const count = await this.databaseService.client.role.count({
            where: { AND: [additionalWhere ?? {}, { id }] },
        });

        return count > 0;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        data: IRoleCreate
    ): Promise<IRoleWithPolicies> {
        return tx.role.create({
            data: { ...data, id },
            include: RoleWithPoliciesInclude,
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        { name, description }: IRoleUpdate,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies | null> {
        const { count } = await tx.role.updateMany({
            where: { AND: [additionalWhere ?? {}, { id }] },
            data: { name, description },
        });
        if (count === 0) {
            return null;
        }

        return tx.role.findUnique({
            where: { id },
            include: RoleWithPoliciesInclude,
        });
    }

    async deleteUnusedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<boolean> {
        const { count } = await tx.role.deleteMany({
            where: {
                AND: [additionalWhere ?? {}, { id }],
                isImmutable: false,
                users: { none: {} },
                workspaceMembers: { none: {} },
                projectMembers: { none: {} },
                workspaceInvitesAsWorkspaceRole: { none: {} },
                workspaceInvitesAsProjectRole: { none: {} },
            },
        });

        return count > 0;
    }

    async incrementPolicyRevisionInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<boolean> {
        const { count } = await tx.role.updateMany({
            where: { id },
            data: { policyRevision: { increment: 1 } },
        });

        return count > 0;
    }
}
