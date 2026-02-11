import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantJitAccessRequestDto } from '@modules/tenant/dtos/request/tenant.jit-access.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRolePlatformSupport } from '@modules/tenant/constants/tenant.constant';
import { ITenantMember } from '@modules/tenant/interfaces/tenant.interface';
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
    EnumRoleScope,
    EnumTenantMemberStatus,
    EnumTenantStatus,
    Tenant,
} from '@prisma/client';

@Injectable()
export class TenantMemberService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperService: HelperService
    ) {}

    async addMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        if (!this.databaseUtil.checkIdIsValid(dto.userId)) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.memberUserIdInvalid,
                message: 'tenantMember.error.userIdInvalid',
            });
        }

        const [user, role, memberExist] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.resolveTenantRoleByName(dto.roleName),
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
            const role = await this.resolveTenantRoleByName(dto.roleName);

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
            deletedAt: this.helperService.dateCreate(),
            deletedBy: updatedBy,
        });

        return {};
    }

    async getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
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

    async assumeAccess(
        tenantId: string,
        userId: string,
        dto: TenantJitAccessRequestDto
    ): Promise<IResponseReturn<TenantJitAccessResponseDto>> {
        const tenant = await this.assertTenantExistsAndActive(tenantId);

        const existingMember =
            await this.tenantRepository.existMemberByTenantAndUser(
                tenantId,
                userId
            );

        if (existingMember) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.jitAccessAlreadyActive,
                message: 'tenant.error.jitAccessAlreadyActive',
            });
        }

        const role = await this.resolveTenantRoleByName(
            TenantRolePlatformSupport
        );

        const expiresAt = this.helperService.dateCreate();
        expiresAt.setHours(expiresAt.getHours() + dto.durationInHours);

        const member = await this.tenantRepository.addMember({
            tenantId,
            userId,
            roleId: role.id,
            status: EnumTenantMemberStatus.active,
            isJit: true,
            expiresAt,
            reason: dto.reason,
            createdBy: userId,
            updatedBy: userId,
        });

        return {
            data: {
                memberId: member.id,
                tenantId: tenant.id,
                tenantName: tenant.name,
                role: role.name,
                expiresAt,
                reason: dto.reason,
            },
        };
    }

    async revokeJitAccess(
        tenantId: string,
        userId: string
    ): Promise<IResponseReturn<void>> {
        await this.assertTenantExists(tenantId);

        const jitMember =
            await this.tenantRepository.findActiveJitMemberByTenantAndUser(
                tenantId,
                userId
            );

        if (!jitMember) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.jitAccessNotFound,
                message: 'tenant.error.jitAccessNotFound',
            });
        }

        await this.tenantRepository.revokeJitMember(jitMember.id);

        return {};
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

    private async resolveTenantRoleByName(roleName: string) {
        const roleInTenantScope = await this.roleRepository.existByNameAndScope(
            roleName,
            EnumRoleScope.tenant
        );

        if (roleInTenantScope) {
            return roleInTenantScope;
        }

        const role = await this.roleRepository.existByName(roleName);
        if (role && role.scope !== EnumRoleScope.tenant) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.roleScopeMismatch,
                message: 'tenantRole.error.scopeMismatch',
            });
        }

        if (!role) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.roleNotFound,
                message: 'tenantRole.error.notFound',
            });
        }

        return role;
    }
}
