import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleService } from '@modules/role/services/role.service';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member-invite.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantJitAccessRequestDto } from '@modules/tenant/dtos/request/tenant.jit-access.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import {
    TenantInviteType,
    TenantRolePlatformSupport,
} from '@modules/tenant/constants/tenant.constant';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserService } from '@modules/user/services/user.service';
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
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class TenantMemberService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly roleService: RoleService,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService,
        private readonly helperService: HelperService,
        private readonly inviteService: InviteService,
        private readonly tenantUtil: TenantUtil
    ) {}

    async createMember(
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
                message: 'tenant.member.error.userNotFound',
            });
        }

        if (memberExist) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenant.member.error.exist',
            });
        }

        const member = await this.tenantRepository.createMember({
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
                message: 'tenant.member.error.notFound',
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
                message: 'tenant.member.error.notFound',
            });
        }

        await this.tenantRepository.deleteMember(member.id);

        return {};
    }

    async createInvite(
        tenantId: string,
        dto: TenantMemberInviteCreateRequestDto,
        createdBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InviteCreateResponseDto>> {
        const [tenant, role] = await Promise.all([
            this.tenantRepository.findOneById(tenantId),
            this.resolveTenantRoleById(dto.roleId),
        ]);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'invite.error.contextNotFound',
            });
        }

        // FIXME: user creation, member creation, and invite creation
        // must be wrapped in a single transaction. If invite creation fails, the pending
        // member record and the stub user are left orphaned with no rollback.
        const normalizedEmail = dto.email.toLowerCase().trim();
        let user = await this.userRepository.findOneByEmail(normalizedEmail);
        if (!user) {
            user = await this.userService.createForInvitation(
                normalizedEmail,
                EnumUserSignUpFrom.tenant,
                requestLog,
                createdBy
            );
        }

        const existingMember =
            await this.tenantRepository.findMemberByTenantAndUser(
                tenantId,
                user.id
            );
        if (
            existingMember &&
            existingMember.status !== EnumTenantMemberStatus.pending
        ) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'invite.error.memberExist',
            });
        }

        try {
            const memberId = existingMember
                ? existingMember.id
                : (
                      await this.tenantRepository.createMember({
                          tenantId,
                          userId: user.id,
                          roleId: role.id,
                          status: EnumTenantMemberStatus.pending,
                          createdBy,
                          updatedBy: createdBy,
                      })
                  ).id;

            const data = await this.inviteService.createInvite(
                {
                    inviteType: TenantInviteType,
                    roleScope: EnumRoleScope.tenant,
                    contextId: tenantId,
                    contextName: tenant.name,
                    memberId,
                    userId: user.id,
                },
                createdBy
            );

            return { data };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async claimInvite(
        token: string,
        firstName: string,
        lastName: string,
        password: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.inviteService.getOneActiveByToken(
            token,
            TenantInviteType
        );

        try {
            // FIXME: finalizeInviteSignup and updateMember must be wrapped in a single
            // transaction. If updateMember fails after signup completes, the user is activated
            // but the tenant member status remains pending indefinitely.
            await this.inviteService.signupByInvite(
                {
                    token,
                    inviteType: TenantInviteType,
                    firstName,
                    lastName,
                    password,
                },
                requestLog
            );

            await this.tenantRepository.updateMember(invite.memberId, {
                status: EnumTenantMemberStatus.active,
                updatedBy: invite.userId,
            });
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async sendInvite(
        tenantId: string,
        memberId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InviteSendResponseDto>> {
        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            tenantId
        );

        if (!member) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'invite.error.memberNotFound',
            });
        }

        const { id: inviteId } =
            await this.inviteService.getOneActiveByUserAndContext(
                member.userId,
                TenantInviteType,
                tenantId
            );

        const data = await this.inviteService.sendInvite(
            inviteId,
            requestLog,
            requestedBy
        );

        return { data };
    }

    async getMemberRoles(): Promise<IResponseReturn<RoleListResponseDto[]>> {
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
            data: data.map(member => this.tenantUtil.mapMember(member)),
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
                message: 'tenant.role.error.notFound',
            });
        }

        const expiresAt = this.helperService.dateCreate();
        expiresAt.setHours(expiresAt.getHours() + dto.durationInHours);

        const member = await this.tenantRepository.createMember({
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
            data: this.tenantUtil.mapJitAccess(
                member,
                tenant,
                role.name,
                expiresAt,
                dto.reason
            ),
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

    private async resolveTenantRoleById(
        roleId: string
    ): Promise<{ id: string; name: string; scope: EnumRoleScope }> {
        const role = await this.roleRepository.existById(roleId);
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.roleNotFound,
                message: 'tenant.role.error.notFound',
            });
        }

        if (role.scope !== EnumRoleScope.tenant) {
            throw new BadRequestException({
                statusCode: EnumTenantStatusCodeError.roleScopeMismatch,
                message: 'tenant.role.error.scopeMismatch',
            });
        }

        return role;
    }
}
