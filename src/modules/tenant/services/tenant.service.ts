import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
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
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumRoleScope,
    EnumTenantStatus,
    Tenant,
} from '@prisma/client';

@Injectable()
export class TenantService implements ITenantService {
    private readonly logger = new Logger(TenantService.name);

    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
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

        const tenant = await this.tenantRepository.findOneById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        if (tenant.status !== EnumTenantStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.inactive,
                message: 'tenant.error.inactive',
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
                message: 'tenantMember.error.forbidden',
            });
        }

        if (
            tenantMember.isJit &&
            tenantMember.expiresAt &&
            tenantMember.expiresAt < this.helperService.dateCreate()
        ) {
            await this.tenantRepository.revokeJitMember(tenantMember.id);

            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantMember.error.forbidden',
            });
        }

        if (tenantMember.role.scope !== EnumRoleScope.tenant) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.roleScopeMismatch,
                message: 'tenantRole.error.scopeMismatch',
            });
        }

        return tenantMember;
    }

    async validateTenantRoleGuard(
        request: IRequestAppWithTenant,
        requiredRoleNames: string[]
    ): Promise<boolean> {
        const tenantMember = request.__tenantMember;
        if (!tenantMember?.role) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantMember.error.forbidden',
            });
        }

        if (requiredRoleNames.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumTenantStatusCodeError.predefinedRoleNotFound,
                message: 'tenantRole.error.predefinedNotFound',
            });
        }

        if (!requiredRoleNames.includes(tenantMember.role.name)) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantRole.error.forbidden',
            });
        }

        return true;
    }

    async validateTenantPermissionGuard(
        request: IRequestAppWithTenant,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumTenantStatusCodeError.predefinedRoleNotFound,
                message: 'tenantRole.error.predefinedNotFound',
            });
        }

        const abilities =
            (request.__tenantMember?.role?.abilities ?? []) as RoleAbilityRequestDto[];

        const abilityRule =
            this.policyAbilityFactory.createForUser(abilities);
        const isAllowed = this.policyAbilityFactory.handlerAbilities(
            abilityRule,
            requiredAbilities
        );

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantRole.error.forbidden',
            });
        }

        return true;
    }

    async getListOffset(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantResponseDto>> {
        const { data, ...others } =
            await this.tenantRepository.findWithPaginationOffset(pagination);

        return {
            ...others,
            data: data.map(tenant => this.mapTenant(tenant)),
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
            data: this.mapTenant(tenant),
        };
    }

    async create(
        dto: TenantCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const tenant = await this.tenantRepository.create({
            name: dto.name.trim(),
            status: EnumTenantStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: tenant.id,
            },
        };
    }

    async update(
        id: string,
        dto: TenantUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const data: {
            name?: string;
            status?: EnumTenantStatus;
            updatedBy: string;
        } = { updatedBy };

        if (dto.name !== undefined) {
            data.name = dto.name.trim();
        }

        if (dto.status !== undefined) {
            data.status = dto.status;
        }

        if (dto.name === undefined && dto.status === undefined) {
            return {};
        }

        await this.tenantRepository.update(id, data);

        return {};
    }

    async delete(id: string, deletedBy: string): Promise<IResponseReturn<void>> {
        try {
            await this.tenantRepository.delete(id, deletedBy);
        } catch (error) {
            this.logger.warn(
                `Tenant soft-delete failed [id=${id}, deletedBy=${deletedBy}]: ${error?.message ?? error}`
            );
        }

        return {};
    }

    private mapTenant(tenant: Tenant): TenantResponseDto {
        return {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    }
}
