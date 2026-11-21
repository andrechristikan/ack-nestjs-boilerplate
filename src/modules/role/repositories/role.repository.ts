import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    RoleSelect,
    RoleWithPoliciesInclude,
    RoleWithPolicyCountInclude,
} from '@modules/role/constants/role.constant';
import type {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import type { IRoleRepository } from '@modules/role/interfaces/role.repository.interface';
import { Injectable } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client/client';

@Injectable()
export class RoleRepository implements IRoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        { where, ...params }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: RoleWithPolicyCountInclude,
        });
    }

    async findWithPaginationCursorBySystem(
        { where, ...params }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: RoleWithPolicyCountInclude,
        });
    }

    async findOneWithPoliciesById(
        id: string
    ): Promise<IRoleWithPolicies | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            include: RoleWithPoliciesInclude,
        });
    }

    async findOneById(id: string): Promise<IRole | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            select: RoleSelect,
        });
    }

    async findOneByName(name: string): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: { name },
            select: RoleSelect,
        });
    }

    async findOneWithPolicyCountById(
        id: string
    ): Promise<IRoleWithPolicyCount | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            include: RoleWithPolicyCountInclude,
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
            include: RoleWithPoliciesInclude,
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
            include: RoleWithPoliciesInclude,
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
