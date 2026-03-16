import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
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
    Tenant,
    TenantMember,
} from '@generated/prisma-client';

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
    }: IPaginationQueryOffsetParams<
        Prisma.TenantSelect,
        Prisma.TenantWhereInput
    >): Promise<IResponsePagingReturn<Tenant>> {
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
                deletedAt: null,
            },
        });
    }

    async findOneBySlug(slug: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findFirst({
            where: { slug },
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

    async update(id: string, data: ITenantUpdate): Promise<Tenant> {
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
                updatedBy: deletedBy,
                deletedAt,
                deletedBy,
            },
        });
    }

    async existMemberByTenantAndUser(
        tenantId: string,
        userId: string,
        status?: EnumTenantMemberStatus
    ): Promise<{ id: string } | null> {
        const where: any = {
            tenantId,
            userId,
            tenant: {
                deletedAt: null,
            },
        };

        if (status !== undefined) {
            where.status = status;
        }

        return this.databaseService.tenantMember.findFirst({
            where,
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
        });
    }

    async findOneMemberByIdAndTenant(
        memberId: string,
        tenantId: string
    ): Promise<ITenantMemberWithTenant | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                id: memberId,
                tenantId,
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                tenant: true,
            },
        });
    }

    async createMember(data: ITenantMemberCreate): Promise<TenantMember> {
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
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
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
                    user: true,
                },
            }
        );
    }

    async findAllMembershipsByUser(
        userId: string
    ): Promise<ITenantMemberWithTenant[]> {
        return this.databaseService.tenantMember.findMany({
            where: {
                userId,
                status: EnumTenantMemberStatus.active,
                tenant: {
                    deletedAt: null,
                },
            },
            include: {
                tenant: true,
            },
        });
    }

    async findMembershipsWithPaginationCursorByUser(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
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
                        deletedAt: null,
                    },
                },
                include: {
                    tenant: true,
                },
            }
        );
    }
}
