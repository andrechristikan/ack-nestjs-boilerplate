import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IRole,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import {
    RolePoliciesInclude,
    RoleSelect,
} from '@modules/role/constants/role.constant';
import type { IRoleRepository } from '@modules/role/interfaces/role.repository.interface';
import { Injectable } from '@nestjs/common';
import type { EnumRoleScope, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class RoleRepository implements IRoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset<
            IRoleWithPolicyCount,
            Prisma.RoleWhereInput
        >(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...scope,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findWithPaginationCursorBySystem(
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor<
            IRoleWithPolicyCount,
            Prisma.RoleWhereInput
        >(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...scope,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findWithPaginationOffsetByShared(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset<
            IRoleWithPolicyCount,
            Prisma.RoleWhereInput
        >(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...scope,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findOneWithPoliciesById(
        id: string
    ): Promise<IRoleWithPolicies | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            include: RolePoliciesInclude,
        });
    }

    async findOneById(id: string): Promise<IRole | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            select: RoleSelect,
        });
    }

    async findManyByIds(ids: string[]): Promise<IRole[]> {
        return this.databaseService.client.role.findMany({
            where: { id: { in: ids } },
            select: RoleSelect,
        });
    }

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRole | null> {
        return tx.role.findUnique({
            where: { id },
            select: RoleSelect,
        });
    }

    async findOneByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null> {
        return this.databaseService.client.role.findUnique({
            where: { scope_key: { scope, key } },
            select: RoleSelect,
        });
    }

    async findOneByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null> {
        return tx.role.findUnique({
            where: { scope_key: { scope, key } },
            select: RoleSelect,
        });
    }

    async update(id: string, data: IRoleUpdate): Promise<IRoleWithPolicies> {
        return this.databaseService.client.role.update({
            where: { id },
            data,
            include: RolePoliciesInclude,
        });
    }
}
