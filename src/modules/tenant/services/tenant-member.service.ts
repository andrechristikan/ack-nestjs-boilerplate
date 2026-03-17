import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { ITenantMemberService } from '@modules/tenant/interfaces/tenant-member.service.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteService } from '@modules/invite/services/invite.service';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member-invite.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantInviteType } from '@modules/tenant/constants/tenant.constant';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserService } from '@modules/user/services/user.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumRoleScope,
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
    EnumUserSignUpFrom,
} from '@generated/prisma-client';

@Injectable()
export class TenantMemberService implements ITenantMemberService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService,
        private readonly inviteService: InviteService,
        private readonly tenantUtil: TenantUtil
    ) {}

    async createMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [user, memberExist] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.tenantRepository.existMemberByTenantAndUser(
                tenantId,
                dto.userId,
                EnumTenantMemberStatus.active
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

        if (dto.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        const member = await this.tenantRepository.createMember({
            tenantId,
            userId: dto.userId,
            role: dto.role,
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

        if (dto.status === undefined && !dto.role) {
            return {};
        }

        if (member.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        if (dto.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        await this.tenantRepository.updateMember(member.id, {
            role: dto.role,
            status: dto.status,
            updatedBy,
        });

        return {};
    }

    async deleteMember(
        tenantId: string,
        memberId: string,
        deletedBy: string
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

        if (member.role === EnumTenantMemberRole.owner) {
            if (member.userId !== deletedBy) {
                throw new ForbiddenException({
                    statusCode: EnumTenantStatusCodeError.memberForbidden,
                    message: 'tenant.member.error.forbidden',
                });
            }

            const activeMemberCount =
                await this.tenantRepository.countActiveMembersByTenant(
                    tenantId
                );
            if (activeMemberCount <= 1) {
                await this.tenantRepository.deleteTenantAndMember(
                    tenantId,
                    member.id,
                    deletedBy
                );
                return {};
            }

            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
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
        const tenant = await this.tenantRepository.findOneById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'invite.error.contextNotFound',
            });
        }

        // FIXME: user creation, member creation, and invite creation
        // must be wrapped in a single transaction. If invite creation fails, the pending
        // member record and the stub user are left orphaned with no rollback.
        let user = await this.userRepository.findOneByEmail(dto.email);
        if (!user) {
            user = await this.userService.createForInvitation(
                dto.email,
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
            if (dto.role === EnumTenantMemberRole.owner) {
                throw new ForbiddenException({
                    statusCode: EnumTenantStatusCodeError.memberForbidden,
                    message: 'tenant.member.error.forbidden',
                });
            }

            const memberId = existingMember
                ? existingMember.id
                : (
                      await this.tenantRepository.createMember({
                          tenantId,
                          userId: user.id,
                          role: dto.role,
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

        const invite = await this.inviteService.getOneActiveByUserAndContext(
            member.userId,
            TenantInviteType,
            tenantId
        );

        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.inviteNotFound,
                message: 'invite.error.inviteNotFound',
            });
        }

        const data = await this.inviteService.sendInvite(
            invite.id,
            requestLog,
            requestedBy
        );

        return { data };
    }

    async getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
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
}
