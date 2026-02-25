import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    ITenantCreate,
    ITenantMember,
    ITenantMemberCreate,
    ITenantMemberUpdate,
    ITenantMemberWithTenant,
    ITenantMemberWithUser,
    ITenantUpdate,
} from '@modules/tenant/interfaces/tenant.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
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

    async create(data: ITenantCreate): Promise<Tenant> {
        return this.databaseService.tenant.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async update(
        id: string,
        data: ITenantUpdate
    ): Promise<Tenant> {
        return this.databaseService.tenant.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, deletedBy: string): Promise<Tenant> {
        const deletedAt = this.helperService.dateCreate();

        return this.databaseService.tenant.update({
            where: { id, deletedAt: null },
            data: {
                status: EnumTenantStatus.inactive,
                updatedBy: deletedBy,
                deletedAt,
                deletedBy,
            },
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
                tenant: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
            },
        });
    }

    async findMemberByTenantAndUser(
        tenantId: string,
        userId: string
    ): Promise<Pick<TenantMember, 'id' | 'status'> | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                userId,
                tenant: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
                status: true,
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
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                role: true
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
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                role: true,
            },
        });
    }

    async createMember(
        data: ITenantMemberCreate
    ): Promise<TenantMember> {
        return this.databaseService.tenantMember.create({
            data,
        });
    }

    async updateMember(
        memberId: string,
        data: ITenantMemberUpdate
    ): Promise<TenantMember> {
        return this.databaseService.tenantMember.update({
            where: {
                id: memberId,
            },
            data,
        });
    }

    async deleteMember(memberId: string): Promise<TenantMember> {
        return this.databaseService.tenantMember.delete({
            where: { id: memberId },
        });
    }

    async findMembersWithPaginationOffset(
        tenantId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ITenantMemberWithUser>> {
        return this.paginationService.offset<ITenantMemberWithUser>(
            this.databaseService.tenantMember,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                    tenant: {
                        deletedAt: null,
                    },
                },
                include: {
                    role: true,
                    user: true,
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
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                role: true,
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

    async findAllMembershipsByUser(userId: string): Promise<ITenantMemberWithTenant[]> {
        return this.databaseService.tenantMember.findMany({
            where: {
                userId,
                status: EnumTenantMemberStatus.active,
                tenant: {
                    status: EnumTenantStatus.active,
                    deletedAt: null,
                },
            },
            include: {
                role: true,
                tenant: true,
            },
        });
    }

    async findMembershipsWithPaginationCursorByUser(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<ITenantMemberWithTenant>> {
        return this.paginationService.cursor<ITenantMemberWithTenant>(
            this.databaseService.tenantMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumTenantMemberStatus.active,
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
