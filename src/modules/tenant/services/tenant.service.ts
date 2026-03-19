import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantTransferOwnershipRequestDto } from '@modules/tenant/dtos/request/tenant.transfer-ownership.request.dto';
import { TenantUpdateSlugRequestDto } from '@modules/tenant/dtos/request/tenant.update-slug.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { IRequestAppWithTenant } from '@modules/tenant/interfaces/request.tenant.interface';
import { ITenantService } from '@modules/tenant/interfaces/tenant.service.interface';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
} from '@generated/prisma-client';
import { HelperService } from '@common/helper/services/helper.service';

@Injectable()
export class TenantService implements ITenantService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly tenantUtil: TenantUtil,
        private readonly helperService: HelperService
    ) {}

    async validateTenantGuard(
        request: IRequestAppWithTenant
    ): Promise<ITenant> {
        const tenantId = request.__tenantId;

        if (!tenantId) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.xTenantIdRequired,
                message: 'tenant.error.xTenantIdRequired',
            });
        }

        if (!this.databaseUtil.checkIdIsValid(tenantId)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.xTenantIdInvalid,
                message: 'tenant.error.xTenantIdInvalid',
            });
        }

        const tenant = await this.tenantRepository.findOneById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        return tenant;
    }

    async validateTenantMemberGuard(
        request: IRequestAppWithTenant
    ): Promise<ITenantMember> {
        const { user } = request;

        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const tenant = request.__tenant;
        if (!tenant) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        const tenantMember =
            await this.tenantRepository.findOneActiveMemberByTenantAndUser(
                tenant.id,
                user.userId
            );

        if (!tenantMember) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        return tenantMember;
    }

    async validateTenantRoleGuard(
        request: IRequestAppWithTenant,
        requiredRoleNames: EnumTenantMemberRole[]
    ): Promise<boolean> {
        const tenantMember = request.__tenantMember;
        if (!tenantMember) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        if (requiredRoleNames.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumTenantStatusCodeError.predefinedRoleNotFound,
                message: 'tenant.role.error.predefinedNotFound',
            });
        }

        if (!requiredRoleNames.includes(tenantMember.role)) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.role.error.forbidden',
            });
        }

        return true;
    }

    async getListOffset(
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantSelect,
            Prisma.TenantWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantResponseDto>> {
        const { data, ...others } =
            await this.tenantRepository.findWithPaginationOffset(pagination);

        return {
            ...others,
            data: data.map(tenant => this.tenantUtil.mapTenant(tenant)),
        };
    }

    async getListByUserOffset(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantSelect,
            Prisma.TenantWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantResponseDto>> {
        const { data, ...others } =
            await this.tenantRepository.findWithPaginationOffsetByUser(
                userId,
                pagination
            );

        return {
            ...others,
            data: data.map(tenant => this.tenantUtil.mapTenant(tenant)),
        };
    }

    async getOne(id: string): Promise<IResponseReturn<TenantResponseDto>> {
        const tenant = await this.tenantRepository.findOneById(id);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        return {
            data: this.tenantUtil.mapTenant(tenant),
        };
    }

    async create(
        dto: TenantCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const name = dto.name.trim();
        const slug = await this.createUniqueSlug(name);
        const tenant = await this.tenantRepository.createWithOwner(
            {
                name,
                description: dto.description?.trim() ?? '',
                slug,
                createdBy,
                updatedBy: createdBy,
            },
            createdBy
        );

        return {
            data: {
                id: tenant.id,
            },
        };
    }

    async update(
        id: string,
        dto: TenantUpdateRequestDto,
        updatedBy: string,
        callerRole: EnumTenantMemberRole
    ): Promise<IResponseReturn<void>> {
        if (dto.name === undefined && dto.description === undefined) {
            return {};
        }

        if (
            dto.name !== undefined &&
            callerRole !== EnumTenantMemberRole.owner
        ) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.nameUpdateForbidden,
                message: 'tenant.error.nameUpdateForbidden',
            });
        }

        const data: {
            name?: string;
            description?: string;
            updatedBy: string;
        } = { updatedBy };

        if (dto.name !== undefined) {
            data.name = dto.name.trim();
        }

        if (dto.description !== undefined) {
            data.description = dto.description.trim();
        }

        await this.tenantRepository.update(id, data);

        return {};
    }

    async updateSlug(
        id: string,
        dto: TenantUpdateSlugRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const slug = await this.createUniqueSlug(dto.slug, id);
        await this.tenantRepository.update(id, {
            slug,
            updatedBy,
        });

        return {};
    }

    async switchTenant(
        tenantId: string,
        userId: string
    ): Promise<IResponseReturn<void>> {
        const member =
            await this.tenantRepository.findOneActiveMemberByTenantAndUser(
                tenantId,
                userId
            );

        if (!member) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        await this.tenantRepository.updateLastTenant(userId, tenantId);
        return {};
    }

    async transferOwnership(
        tenantId: string,
        { memberId }: TenantTransferOwnershipRequestDto,
        requestedBy: string
    ): Promise<IResponseReturn<void>> {
        const [currentOwner, targetMember] = await Promise.all([
            this.tenantRepository.findOneOwnerMemberByTenant(tenantId),
            this.tenantRepository.findOneMemberByIdAndTenant(
                memberId,
                tenantId
            ),
        ]);

        if (!currentOwner || currentOwner.userId !== requestedBy) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        if (
            !targetMember ||
            targetMember.status !== EnumTenantMemberStatus.active
        ) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.notFound',
            });
        }

        if (targetMember.role === EnumTenantMemberRole.owner) {
            return {};
        }

        await this.tenantRepository.transferOwnership(
            tenantId,
            currentOwner.id,
            targetMember.id,
            requestedBy
        );

        return {};
    }

    async delete(
        id: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.tenantRepository.deleteWithCascade(id, deletedBy);

        return {};
    }

    private async createUniqueSlug(
        value: string,
        excludeTenantId?: string
    ): Promise<string> {
        const baseSlug = this.tenantUtil.createSlug(value);
        let slug = baseSlug;

        for (let attempt = 0; attempt < 10; attempt++) {
            const existing = await this.tenantRepository.findOneBySlug(slug);
            if (!existing || existing.id === excludeTenantId) {
                return slug;
            }

            slug = `${baseSlug}-${this.helperService.randomString(6).toLowerCase()}`;
        }

        return `${baseSlug}-${this.helperService.randomString(10).toLowerCase()}`;
    }
}
