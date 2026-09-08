import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@generated/prisma-client';

@Injectable()
export class RoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>> {
        return this.paginationService.offset<
            IRoleWithPolicyCount,
            Prisma.RoleWhereInput
        >(this.databaseService.client.role, {
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
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>> {
        return this.paginationService.cursor<
            IRoleWithPolicyCount,
            Prisma.RoleWhereInput
        >(this.databaseService.client.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
            include: { _count: { select: { policies: true } } },
        });
    }

    async findOneById(id: string): Promise<IRoleWithPolicies | null> {
        return this.databaseService.client.role.findUnique({
            where: { id },
            include: { policies: true },
        });
    }

    async existByName(name: string): Promise<IRole | null> {
        return this.databaseService.client.role.findFirst({
            where: {
                name: name,
            },
            select: { id: true, type: true, name: true },
        });
    }

    async existById(id: string): Promise<IRole | null> {
        return this.databaseService.client.role.findUnique({
            where: {
                id,
            },
            select: { id: true, type: true, name: true },
        });
    }

    async used(id: string): Promise<{ id: string } | null> {
        return this.databaseService.client.role.findFirst({
            where: {
                users: {
                    some: {
                        roleId: id,
                    },
                },
            },
            select: { id: true },
        });
    }

    async create(data: IRoleCreate): Promise<IRoleWithPolicies> {
        return this.databaseService.client.role.create({
            data,
            include: { policies: true },
        });
    }

    async update(id: string, data: IRoleUpdate): Promise<IRoleWithPolicies> {
        return this.databaseService.client.role.update({
            where: { id },
            data,
            include: { policies: true },
        });
    }

    async delete(id: string): Promise<Role> {
        return this.databaseService.client.role.delete({ where: { id } });
    }
}
