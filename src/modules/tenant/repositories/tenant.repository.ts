import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ITenantMember } from '@modules/tenant/interfaces/tenant.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
    Prisma,
    Tenant,
    TenantMember,
} from '@prisma/client';

@Injectable()
export class TenantRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffset(
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<Tenant>> {
        return this.paginationService.offset<Tenant>(this.databaseService.tenant, {
            ...params,
            where: {
                ...where,
            },
        });
    }

    async findOneById(id: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findUnique({
            where: { id },
        });
    }

    async findOneActiveById(id: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findFirst({
            where: {
                id,
                status: EnumTenantStatus.active,
            },
        });
    }

    async create(
        data: Prisma.TenantUncheckedCreateInput
    ): Promise<Tenant> {
        return this.databaseService.tenant.create({
            data,
        });
    }

    async update(
        id: string,
        data: Prisma.TenantUncheckedUpdateInput
    ): Promise<Tenant> {
        return this.databaseService.tenant.update({
            where: { id },
            data,
        });
    }

    async existMemberByTenantAndUser(
        tenantId: string,
        userId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                userId,
            },
            select: {
                id: true,
            },
        });
    }

    async findOneActiveMemberByTenantAndUser(
        tenantId: string,
        userId: string
    ): Promise<ITenantMember | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                userId,
                status: EnumTenantMemberStatus.active,
            },
            include: {
                role: true,
                tenant: true,
            },
        });
    }

    async findOneMemberByIdAndTenant(
        memberId: string,
        tenantId: string
    ): Promise<ITenantMember | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                id: memberId,
                tenantId,
            },
            include: {
                role: true,
                tenant: true,
            },
        });
    }

    async addMember(
        data: Prisma.TenantMemberUncheckedCreateInput
    ): Promise<TenantMember> {
        return this.databaseService.tenantMember.create({
            data,
        });
    }

    async updateMember(
        memberId: string,
        data: Prisma.TenantMemberUncheckedUpdateInput
    ): Promise<TenantMember> {
        return this.databaseService.tenantMember.update({
            where: {
                id: memberId,
            },
            data,
        });
    }

    async findMembersWithPaginationOffset(
        tenantId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ITenantMember>> {
        return this.paginationService.offset<ITenantMember>(
            this.databaseService.tenantMember,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                },
                include: {
                    role: true,
                    tenant: true,
                },
            }
        );
    }

    async findMembershipsWithPaginationCursorByUser(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<ITenantMember>> {
        return this.paginationService.cursor<ITenantMember>(
            this.databaseService.tenantMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumTenantMemberStatus.active,
                    tenant: {
                        status: EnumTenantStatus.active,
                    },
                },
                include: {
                    role: true,
                    tenant: true,
                },
            }
        );
    }
}
