import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { IConfigTenant } from '@configs/tenant.config';
import { EnumInviteStatusCodeError } from '@modules/tenant/enums/tenant-invite.status-code.enum';
import { TenantInviteSignupRequestDto } from '@modules/tenant/dtos/request/tenant-invite-signup.request.dto';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TenantInviteRepository } from '@modules/tenant/repositories/tenant-invite.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumTenantInviteStatus,
    EnumTenantInviteType,
    EnumTenantMemberStatus,
    EnumUserSignUpFrom,
    Prisma,
    TenantInvite,
} from '@generated/prisma-client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TenantInviteService {
    constructor(
        private readonly tenantInviteRepository: TenantInviteRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService,
        private readonly authUtil: AuthUtil,
        private readonly tenantUtil: TenantUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly configService: ConfigService,
    ) {}

    private mapInvite(
        invite: Pick<
            TenantInvite,
            | 'id'
            | 'tenantId'
            | 'invitedEmail'
            | 'tenantRole'
            | 'type'
            | 'expiresAt'
            | 'acceptedAt'
            | 'status'
            | 'revokedAt'
            | 'createdAt'
        >
    ): TenantInviteResponseDto {
        const inviteStatus = this.tenantUtil.mapInviteStatus({
            status: invite.status,
            expiresAt: invite.expiresAt,
            acceptedAt: invite.acceptedAt,
            revokedAt: invite.revokedAt,
        });

        return plainToInstance(TenantInviteResponseDto, {
            id: invite.id,
            tenantId: invite.tenantId,
            invitedEmail: invite.invitedEmail,
            tenantRole: invite.tenantRole,
            type: invite.type,
            createdAt: invite.createdAt,
            status: inviteStatus.status,
            expiresAt: inviteStatus.expiresAt,
            acceptedAt: inviteStatus.acceptedAt,
            revokedAt: inviteStatus.revokedAt,
            remainingSeconds: inviteStatus.remainingSeconds,
        });
    }

    async createInvite(
        tenantId: string,
        dto: TenantInviteCreateRequestDto,
        invitedById: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        const tenant = await this.tenantRepository.findOneById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        try {
            const existingUser = await this.userRepository.findOneByEmail(dto.email);
            const inviteeType = existingUser
                ? EnumTenantInviteType.registered
                : EnumTenantInviteType.unregistered;
            const user =
                existingUser ??
                (await this.userService.createForInvitation(
                    dto.email,
                    EnumUserSignUpFrom.tenant,
                    requestLog,
                    invitedById
                ));

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
                    message: 'tenant.member.error.exist',
                });
            }

            if (!existingMember) {
                await this.tenantRepository.createMember({
                    tenantId,
                    userId: user.id,
                    role: dto.role,
                    status: EnumTenantMemberStatus.pending,
                    createdBy: invitedById,
                    updatedBy: invitedById,
                });
            }

            const existingPending =
                await this.tenantInviteRepository.findOnePendingByEmailAndTenant(
                    dto.email,
                    tenantId
                );
            if (existingPending) {
                await this.tenantInviteRepository.revoke(
                    existingPending.id,
                    invitedById
                );
            }

            const inviteConfig = this.configService.getOrThrow<IConfigTenant>(
                'tenant'
            ).invite;
            const effectiveExpiredInMinutes = dto.expiresInDays
                ? dto.expiresInDays * 24 * 60
                : inviteConfig.expiredInMinutes;
            const tokenInfo = this.tenantUtil.createInviteToken({
                ...inviteConfig,
                expiredInMinutes: effectiveExpiredInMinutes,
            });

            const invite = await this.tenantInviteRepository.create({
                tenantId,
                invitedById,
                invitedEmail: dto.email,
                tenantRole: dto.role,
                type: inviteeType,
                status: EnumTenantInviteStatus.pending,
                token: tokenInfo.token,
                expiresAt: tokenInfo.expiresAt,
                createdBy: invitedById,
                updatedBy: invitedById,
            });
            if (!invite) {
                throw new NotFoundException({
                    statusCode: EnumInviteStatusCodeError.notFound,
                    message: 'tenant.invite.error.tokenInvalid',
                });
            }

            await this.notificationUtil.sendTenantInvite(
                dto.email,
                {
                    tenantName: tenant.name,
                    token: tokenInfo.token,
                    expiresAt: tokenInfo.expiresAt,
                    role: dto.role,
                },
                invitedById,
                inviteeType === EnumTenantInviteType.registered
                    ? existingUser?.id
                    : undefined
            );

            return { data: this.mapInvite(invite) };
        } catch (err: unknown) {
            if (
                err instanceof ConflictException ||
                err instanceof ForbiddenException ||
                err instanceof NotFoundException
            ) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async claimRegistered(
        token: string,
        userId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.tenantInviteRepository.findOneActiveByToken(
            token
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumInviteStatusCodeError.notFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user || user.email !== invite.invitedEmail) {
            throw new ForbiddenException({
                statusCode: EnumInviteStatusCodeError.tokenInvalid,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        const pendingMember = await this.tenantRepository.findMemberByTenantAndUser(
            invite.tenantId,
            userId
        );
        if (!pendingMember || pendingMember.status !== EnumTenantMemberStatus.pending) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenant.member.error.exist',
            });
        }

        await this.tenantInviteRepository.accept(
            invite.id,
            userId,
            requestLog,
            pendingMember.id
        );
    }

    async signupAndClaim(
        token: string,
        { password }: TenantInviteSignupRequestDto,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.tenantInviteRepository.findOneActiveByToken(
            token
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumInviteStatusCodeError.notFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        const user = await this.userRepository.findOneByEmail(invite.invitedEmail);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.userNotFound',
            });
        }

        const pendingMember = await this.tenantRepository.findMemberByTenantAndUser(
            invite.tenantId,
            user.id
        );
        if (!pendingMember || pendingMember.status !== EnumTenantMemberStatus.pending) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenant.member.error.exist',
            });
        }

        const emailName = invite.invitedEmail.split('@')[0]?.trim();
        const name = user.name?.trim() || emailName || 'User';
        const passwordPayload = this.authUtil.createPassword(user.id, password);

        await this.tenantInviteRepository.signupAndAccept(
            invite.id,
            user.id,
            pendingMember.id,
            name,
            passwordPayload,
            requestLog
        );
    }

    async revokeInvite(
        inviteId: string,
        tenantId: string,
        revokedById: string
    ): Promise<IResponseReturn<void>> {
        const invite = await this.tenantInviteRepository.findOneByIdAndTenant(
            inviteId,
            tenantId
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumInviteStatusCodeError.notFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        const status = this.tenantUtil.mapInviteStatus({
            status: invite.status,
            expiresAt: invite.expiresAt,
            acceptedAt: invite.acceptedAt,
            revokedAt: invite.revokedAt,
        });
        if (status.status === EnumTenantInviteStatus.accepted) {
            throw new ForbiddenException({
                statusCode: EnumInviteStatusCodeError.alreadyAccepted,
                message: 'tenant.invite.error.alreadyAccepted',
            });
        }

        if (status.status === EnumTenantInviteStatus.revoked) {
            throw new ForbiddenException({
                statusCode: EnumInviteStatusCodeError.revoked,
                message: 'tenant.invite.error.revoked',
            });
        }

        await this.tenantInviteRepository.revoke(inviteId, revokedById);

        return {};
    }

    async getInviteByToken(
        token: string
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        const invite = await this.tenantInviteRepository.findOneByToken(token);
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumInviteStatusCodeError.notFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        return { data: this.mapInvite(invite) };
    }

    async listInvites(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantInviteSelect,
            Prisma.TenantInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantInviteResponseDto>> {
        const { data, ...others } =
            await this.tenantInviteRepository.findWithPaginationOffset(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(invite => this.mapInvite(invite)),
        };
    }
}
