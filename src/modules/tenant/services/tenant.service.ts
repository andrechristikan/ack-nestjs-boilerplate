import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';
import { TenantUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { ITenantService } from '@modules/tenant/interfaces/tenant.service.interface';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumTenantMemberStatus,
    EnumTenantStatus,
    Tenant,
} from '@prisma/client';

@Injectable()
export class TenantService implements ITenantService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async validateTenantGuard(request: IRequestApp): Promise<ITenant> {
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

        if (tenant.status !== EnumTenantStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.inactive,
                message: 'tenant.error.inactive',
            });
        }

        return tenant;
    }

    async validateTenantMemberGuard(request: IRequestApp): Promise<ITenantMember> {
        const { user } = request;

        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const tenant = request.__tenant
            ? request.__tenant
            : await this.validateTenantGuard(request);
        request.__tenant = tenant;

        const tenantMember =
            await this.tenantRepository.findOneActiveMemberByTenantAndUser(
                tenant.id,
                user.userId
            );

        if (!tenantMember?.role) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantMember.error.forbidden',
            });
        }

        request.__abilities = (tenantMember.role.abilities ?? []) as unknown as RoleAbilityDto[];

        return tenantMember;
    }

    async validateTenantRoleGuard(
        request: IRequestApp,
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
        request: IRequestApp,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumTenantStatusCodeError.predefinedRoleNotFound,
                message: 'tenantRole.error.predefinedNotFound',
            });
        }

        const abilities =
            request.__abilities ??
            ((request.__tenantMember?.role?.abilities ?? []) as unknown as RoleAbilityRequestDto[]);

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
        const tenant = await this.assertTenantExists(id);

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
        await this.assertTenantExists(id);

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

    async delete(id: string, updatedBy: string): Promise<IResponseReturn<void>> {
        await this.assertTenantExists(id);

        await this.tenantRepository.update(id, {
            status: EnumTenantStatus.inactive,
            updatedBy,
        });

        return {};
    }

    async addMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        await this.assertTenantExistsAndActive(tenantId);

        if (!this.databaseUtil.checkIdIsValid(dto.userId)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.memberUserIdInvalid,
                message: 'tenantMember.error.userIdInvalid',
            });
        }

        const [user, role, memberExist] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.roleRepository.existByName(dto.roleName),
            this.tenantRepository.existMemberByTenantAndUser(
                tenantId,
                dto.userId
            ),
        ]);

        if (!user) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenantMember.error.userNotFound',
            });
        }

        if (!role) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.roleNotFound,
                message: 'tenantRole.error.notFound',
            });
        }

        if (memberExist) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenantMember.error.exist',
            });
        }

        const member = await this.tenantRepository.addMember({
            tenantId,
            userId: dto.userId,
            roleId: role.id,
            status: EnumTenantMemberStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: member.id,
            },
        };
    }

    async updateMember(
        tenantId: string,
        memberId: string,
        dto: TenantMemberUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertTenantExists(tenantId);

        if (!this.databaseUtil.checkIdIsValid(memberId)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.memberIdInvalid,
                message: 'tenantMember.error.memberIdInvalid',
            });
        }

        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            tenantId
        );

        if (!member) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenantMember.error.notFound',
            });
        }

        let roleId: string | undefined;
        if (dto.roleName) {
            const role = await this.roleRepository.existByName(dto.roleName);

            if (!role) {
                throw new NotFoundException({
                    statusCode: EnumTenantStatusCodeError.roleNotFound,
                    message: 'tenantRole.error.notFound',
                });
            }

            roleId = role.id;
        }

        if (dto.status === undefined && !roleId) {
            return {};
        }

        await this.tenantRepository.updateMember(member.id, {
            roleId,
            status: dto.status,
            updatedBy,
        });

        return {};
    }

    async deleteMember(
        tenantId: string,
        memberId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertTenantExists(tenantId);

        if (!this.databaseUtil.checkIdIsValid(memberId)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.memberIdInvalid,
                message: 'tenantMember.error.memberIdInvalid',
            });
        }

        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            tenantId
        );

        if (!member) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenantMember.error.notFound',
            });
        }

        if (member.status === EnumTenantMemberStatus.inactive) {
            return {};
        }

        await this.tenantRepository.updateMember(member.id, {
            status: EnumTenantMemberStatus.inactive,
            updatedBy,
        });

        return {};
    }

    async getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        await this.assertTenantExists(tenantId);

        const { data, ...others } =
            await this.tenantRepository.findMembersWithPaginationOffset(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => this.mapMember(member)),
        };
    }

    async getMyTenantsCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        const { data, ...others } =
            await this.tenantRepository.findMembershipsWithPaginationCursorByUser(
                userId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => this.mapMember(member)),
        };
    }

    async getCurrentTenant(
        tenantId: string,
        userId: string
    ): Promise<IResponseReturn<TenantMemberResponseDto>> {
        const tenant = await this.assertTenantExistsAndActive(tenantId);

        const member = await this.tenantRepository.findOneActiveMemberByTenantAndUser(
            tenant.id,
            userId
        );
        if (!member) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenantMember.error.forbidden',
            });
        }

        return {
            data: this.mapMember(member),
        };
    }

    private async assertTenantExists(id: string): Promise<Tenant> {
        if (!this.databaseUtil.checkIdIsValid(id)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.xTenantIdInvalid,
                message: 'tenant.error.xTenantIdInvalid',
            });
        }

        const tenant = await this.tenantRepository.findOneById(id);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        return tenant;
    }

    private async assertTenantExistsAndActive(id: string): Promise<Tenant> {
        const tenant = await this.assertTenantExists(id);
        if (tenant.status !== EnumTenantStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.inactive,
                message: 'tenant.error.inactive',
            });
        }

        return tenant;
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

    private mapMember(member: ITenantMember): TenantMemberResponseDto {
        if (!member.role) {
            throw new InternalServerErrorException({
                statusCode: EnumTenantStatusCodeError.roleNotFound,
                message: 'tenantRole.error.notFound',
            });
        }

        return {
            id: member.id,
            tenantId: member.tenantId,
            userId: member.userId,
            status: member.status,
            role: {
                id: member.role.id,
                name: member.role.name,
            },
            tenant: member.tenant
                ? {
                      id: member.tenant.id,
                      name: member.tenant.name,
                      status: member.tenant.status,
                      createdAt: member.tenant.createdAt,
                      updatedAt: member.tenant.updatedAt,
                  }
                : undefined,
        };
    }
}
