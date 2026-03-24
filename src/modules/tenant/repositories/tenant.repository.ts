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
    ITenantUpdate,
} from '@modules/tenant/interfaces/tenant.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumProjectInviteStatus,
    EnumTenantInviteStatus,
    EnumTenantMemberRole,
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

    async findOneBySlug(slug: string): Promise<Tenant | null> {
        return this.databaseService.tenant.findFirst({
            where: { slug },
        });
    }

    async findUniqueSlug(baseSlug: string): Promise<string> {
        let slug = baseSlug;

        for (let attempt = 0; attempt < 10; attempt++) {
            const existing = await this.databaseService.tenant.findFirst({
                where: { slug },
                select: { id: true },
            });

            if (!existing) {
                return slug;
            }

            slug = `${baseSlug}-${this.helperService.randomString(6).toLowerCase()}`;
        }

        return `${baseSlug}-${this.helperService.randomString(10).toLowerCase()}`;
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
        const where: Prisma.TenantMemberWhereInput = {
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
    ): Promise<TenantMember | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                id: memberId,
                tenantId,
                tenant: {
                    deletedAt: null,
                },
            },
        });
    }

    async findOneOwnerMemberByTenant(
        tenantId: string
    ): Promise<TenantMember | null> {
        return this.databaseService.tenantMember.findFirst({
            where: {
                tenantId,
                role: EnumTenantMemberRole.owner,
                status: EnumTenantMemberStatus.active,
                tenant: {
                    deletedAt: null,
                },
            },
        });
    }

    async countActiveMembersByTenant(tenantId: string): Promise<number> {
        return this.databaseService.tenantMember.count({
            where: {
                tenantId,
                status: EnumTenantMemberStatus.active,
                tenant: {
                    deletedAt: null,
                },
            },
        });
    }

    async createMember(data: ITenantMemberCreate): Promise<TenantMember> {
        return this.databaseService.tenantMember.create({
            data,
        });
    }

    async createWithOwner(
        data: ITenantCreate,
        ownerUserId: string
    ): Promise<Tenant> {
        return this.databaseService.$transaction(async tx => {
            const tenant = await tx.tenant.create({
                data: {
                    ...data,
                    createdBy: ownerUserId,
                    updatedBy: ownerUserId,
                    deletedAt: null,
                },
            });

            await tx.tenantMember.create({
                data: {
                    tenantId: tenant.id,
                    userId: ownerUserId,
                    role: EnumTenantMemberRole.owner,
                    status: EnumTenantMemberStatus.active,
                    createdBy: ownerUserId,
                    updatedBy: ownerUserId,
                },
            });

            return tenant;
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

    async deleteWithCascade(
        tenantId: string,
        deletedBy: string,
        memberId?: string
    ): Promise<void> {
        const deletedAt = this.helperService.dateCreate();

        await this.databaseService.$transaction(async tx => {
            await tx.tenant.update({
                where: { id: tenantId, deletedAt: null },
                data: {
                    updatedBy: deletedBy,
                    deletedAt,
                    deletedBy,
                },
            });

            if (memberId) {
                await tx.tenantMember.delete({
                    where: { id: memberId },
                });
            }

            await tx.project.updateMany({
                where: { tenantId, deletedAt: null },
                data: {
                    updatedBy: deletedBy,
                    deletedAt,
                    deletedBy,
                },
            });

            await tx.tenantInvite.updateMany({
                where: {
                    tenantId,
                    status: EnumTenantInviteStatus.pending,
                    revokedAt: null,
                },
                data: {
                    status: EnumTenantInviteStatus.revoked,
                    revokedAt: deletedAt,
                    revokedById: deletedBy,
                    updatedBy: deletedBy,
                },
            });

            await tx.projectInvite.updateMany({
                where: {
                    project: { tenantId },
                    status: {
                        in: [
                            EnumProjectInviteStatus.pending,
                            EnumProjectInviteStatus.expired,
                        ],
                    },
                    revokedAt: null,
                    acceptedAt: null,
                },
                data: {
                    status: EnumProjectInviteStatus.revoked,
                    revokedAt: deletedAt,
                    updatedBy: deletedBy,
                },
            });
        });
    }

    async transferOwnership(
        _tenantId: string,
        currentOwnerMemberId: string,
        newOwnerMemberId: string,
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.$transaction(async tx => {
            await tx.tenantMember.update({
                where: {
                    id: currentOwnerMemberId,
                },
                data: {
                    role: EnumTenantMemberRole.admin,
                    updatedBy,
                },
            });

            await tx.tenantMember.update({
                where: {
                    id: newOwnerMemberId,
                },
                data: {
                    role: EnumTenantMemberRole.owner,
                    status: EnumTenantMemberStatus.active,
                    updatedBy,
                },
            });
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
    ): Promise<IResponsePagingReturn<TenantMember>> {
        return this.paginationService.offset<TenantMember>(
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

    async findWithPaginationOffsetByUser(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.TenantSelect,
            Prisma.TenantWhereInput
        >
    ): Promise<IResponsePagingReturn<Tenant>> {
        return this.paginationService.offset<Tenant>(
            this.databaseService.tenant,
            {
                ...params,
                where: {
                    ...where,
                    deletedAt: null,
                    members: {
                        some: {
                            userId,
                            status: EnumTenantMemberStatus.active,
                        },
                    },
                },
            }
        );
    }

    async updateLastTenant(userId: string, tenantId: string): Promise<void> {
        await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: { lastTenantId: tenantId, updatedBy: userId },
            select: { id: true },
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
