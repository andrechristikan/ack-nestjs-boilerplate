import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleService } from '@modules/role/services/role.service';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantJitAccessRequestDto } from '@modules/tenant/dtos/request/tenant.jit-access.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRolePlatformSupport } from '@modules/tenant/constants/tenant.constant';
import { ITenantMember } from '@modules/tenant/interfaces/tenant.interface';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantInvitationProvider } from '@modules/tenant/services/tenant-invitation.provider';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumRoleScope,
    EnumRoleType,
    EnumTenantMemberStatus,
} from '@prisma/client';

@Injectable()
export class TenantMemberService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly roleService: RoleService,
        private readonly userRepository: UserRepository,
        private readonly helperService: HelperService,
        private readonly invitationService: InvitationService,
        private readonly tenantInvitationProvider: TenantInvitationProvider
    ) {}

    async addMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [user, role, memberExist] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.resolveTenantRoleById(dto.roleId),
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
        if (dto.roleId) {
            const role = await this.resolveTenantRoleById(dto.roleId);

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
        _updatedBy: string
    ): Promise<IResponseReturn<void>> {

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

        await this.tenantRepository.deleteMember(member.id);

        return {};
    }

    async createInvitation(
        tenantId: string,
        dto: InvitationCreateRequestDto,
        createdBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InvitationCreateResponseDto>> {
        return this.invitationService.createInvitation(
            tenantId,
            dto,
            this.tenantInvitationProvider,
            requestLog,
            createdBy
        );
    }

    async sendInvitation(
        tenantId: string,
        memberId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InvitationSendResponseDto>> {
        return this.invitationService.sendInvitation(
            tenantId,
            memberId,
            this.tenantInvitationProvider,
            requestLog,
            requestedBy
        );
    }

    async getMemberRoles(): Promise<
        IResponseReturn<RoleListResponseDto[]>
    > {
        return this.roleService.getListRolesByScopeAndType(
            EnumRoleScope.tenant,
            EnumRoleType.user
        );
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

    async assumeAccess(
        tenantId: string,
        userId: string,
        dto: TenantJitAccessRequestDto
    ): Promise<IResponseReturn<TenantJitAccessResponseDto>> {
        const tenant = await this.tenantRepository.findOneActiveById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

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

        const role = await this.roleRepository.existByNameAndScope(
            TenantRolePlatformSupport,
            EnumRoleScope.tenant
        );
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.roleNotFound,
                message: 'tenantRole.error.notFound',
            });
        }

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
                description: member.role.description
            },
        };
    }

    private async resolveTenantRoleById(
        roleId: string
    ): Promise<{ id: string; name: string; scope: EnumRoleScope }> {
        const role = await this.roleRepository.existById(roleId);
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
