import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
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
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffset({
        where,
        ...params
    }: IPaginationQueryOffsetParams): Promise<IResponsePagingReturn<Tenant>> {
        return this.paginationService.offset<Tenant>(
            this.databaseService.tenant,
            {
                ...params,
                where: {
                    ...where,
                    deletedAt: null,
                },
            }
        );
    }

    async findOneById(id: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findOneActiveById(id: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findFirst({
            where: {
                id,
                status: EnumTenantStatus.active,
                deletedAt: null,
            },
        });
    }

    async create(data: Prisma.TenantUncheckedCreateInput): Promise<Tenant> {
        return this.databaseService.tenant.create({
            data: {
                ...data,
                deletedAt: null,
            },
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
        userId: string,
        status: EnumTenantMemberStatus = EnumTenantMemberStatus.active
    ): Promise<{ id: string } | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                userId,
                status,
                deletedAt: null,
                tenant: {
                    deletedAt: null,
                },
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
                deletedAt: null,
                tenant: {
                    deletedAt: null,
                },
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
                deletedAt: null,
                tenant: {
                    deletedAt: null,
                },
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
            data: {
                ...data,
                deletedAt: null
            },
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
                    deletedAt: null,
                    tenant: {
                        deletedAt: null,
                    },
                },
                include: {
                    role: true,
                    tenant: true,
                },
            }
        );
    }

    async findActiveJitMemberByTenantAndUser(
        tenantId: string,
        userId: string
    ): Promise<ITenantMember | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                userId,
                isJit: true,
                status: EnumTenantMemberStatus.active,
                deletedAt: null,
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                role: true,
                tenant: true,
            },
        });
    }

    async revokeJitMember(memberId: string): Promise<TenantMember> {
        return this.databaseService.tenantMember.update({
            where: {
                id: memberId,
            },
            data: {
                status: EnumTenantMemberStatus.inactive,
                revokedAt: this.helperService.dateCreate(),
            },
        });
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
                    deletedAt: null,
                    tenant: {
                        status: EnumTenantStatus.active,
                        deletedAt: null,
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
