import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import type { IRoleRepository } from '@modules/role/interfaces/role.repository.interface';
import { Injectable } from '@nestjs/common';
import { EnumRoleType, Prisma } from '@generated/prisma-client/client';

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
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findWithPaginationCursorBySystem(
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findOneWithPoliciesById(
        id: string
    ): Promise<IRoleWithPolicies | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            include: { policies: true },
        });
    }

    async findOneById(id: string): Promise<IRole | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            select: { id: true, type: true, name: true, isImmutable: true },
        });
    }

    async findOneByName(name: string): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: { name },
            select: { id: true, type: true, name: true, isImmutable: true },
        });
    }

    async findOneByUserId(userId: string): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: { users: { some: { id: userId, deletedAt: null } } },
            select: { id: true, type: true, name: true, isImmutable: true },
        });
    }

    async existsById(id: string): Promise<boolean> {
        const count = await this.databaseService.client.role.count({
            where: { id },
        });

        return count > 0;
    }

    async findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRole | null> {
        return tx.role.findUnique({
            where: { id },
            select: { id: true, type: true, name: true, isImmutable: true },
        });
    }

    async findOneWithPolicyCountByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRoleWithPolicyCount | null> {
        return tx.role.findUnique({
            where: { id },
            include: { _count: { select: { policies: true } } },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IRoleCreate
    ): Promise<IRoleWithPolicies> {
        return tx.role.create({
            data: {
                ...data,
                id: roleId,
            },
            include: { policies: true },
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        expectedType: EnumRoleType,
        { description, type }: IRoleUpdate
    ): Promise<IRoleWithPolicies | null> {
        const { count } = await tx.role.updateMany({
            where: { id, type: expectedType },
            data: { description, type },
        });
        if (count === 0) {
            return null;
        }

        return tx.role.findUnique({
            where: { id },
            include: { policies: true },
        });
    }

    async deleteUnusedInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<boolean> {
        const { count } = await tx.role.deleteMany({
            where: { id, isImmutable: false, users: { none: {} } },
        });

        return count > 0;
    }
}
