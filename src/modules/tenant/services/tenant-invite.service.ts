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
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { TenantInviteRepository } from '@modules/tenant/repositories/tenant-invite.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
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
    Prisma,
    TenantInvite,
} from '@generated/prisma-client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TenantInviteService {
    constructor(
        private readonly tenantInviteRepository: TenantInviteRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly authUtil: AuthUtil,
        private readonly tenantUtil: TenantUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly configService: ConfigService
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
        tenant: ITenant,
        dto: TenantInviteCreateRequestDto,
        invitedById: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        try {
            const existingUserId =
                await this.tenantInviteRepository.findUserIdByEmail(dto.email);
            const inviteeType = existingUserId
                ? EnumTenantInviteType.registered
                : EnumTenantInviteType.unregistered;

            if (inviteeType === EnumTenantInviteType.registered) {
                const existingMember =
                    await this.tenantRepository.findMemberByTenantAndUser(
                        tenant.id,
                        existingUserId!
                    );

                if (existingMember) {
                    throw new ConflictException({
                        statusCode: EnumTenantStatusCodeError.memberExist,
                        message: 'tenant.member.error.exist',
                    });
                }
            }

            const existingPending =
                await this.tenantInviteRepository.findOnePendingByEmailAndTenant(
                    dto.email,
                    tenant.id
                );
            if (existingPending) {
                await this.tenantInviteRepository.revoke(
                    existingPending.id,
                    invitedById,
                    requestLog
                );
            }

            const inviteConfig =
                this.configService.getOrThrow<IConfigTenant>('tenant').invite;
            const effectiveExpiredInMinutes = dto.expiresInDays
                ? dto.expiresInDays * 24 * 60
                : inviteConfig.expiredInMinutes;
            const tokenInfo = this.tenantUtil.createInviteToken({
                ...inviteConfig,
                expiredInMinutes: effectiveExpiredInMinutes,
            });

            const invite = await this.tenantInviteRepository.create(
                {
                    tenantId: tenant.id,
                    invitedById,
                    invitedEmail: dto.email,
                    tenantRole: dto.role,
                    type: inviteeType,
                    status: EnumTenantInviteStatus.pending,
                    token: tokenInfo.token,
                    expiresAt: tokenInfo.expiresAt,
                    createdBy: invitedById,
                    updatedBy: invitedById,
                },
                requestLog
            );

            await this.notificationUtil.sendTenantInvite(
                dto.email,
                {
                    tenantName: tenant.name,
                    token: tokenInfo.token,
                    expiresAt: tokenInfo.expiresAt,
                    role: dto.role,
                },
                invitedById,
                existingUserId ?? undefined
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
        userEmail: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite =
            await this.tenantInviteRepository.findOneActiveByToken(token);
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumInviteStatusCodeError.notFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        if (userEmail !== invite.invitedEmail) {
            throw new ForbiddenException({
                statusCode: EnumInviteStatusCodeError.tokenInvalid,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        const existingMember =
            await this.tenantRepository.findMemberByTenantAndUser(
                invite.tenantId,
                userId
            );
        if (existingMember) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenant.member.error.exist',
            });
        }

        await this.tenantInviteRepository.accept(
            invite.id,
            userId,
            requestLog,
            invite.tenantId,
            invite.tenantRole
        );
    }

    async revokeInvite(
        inviteId: string,
        tenantId: string,
        revokedById: string,
        requestLog: IRequestLog
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

        await this.tenantInviteRepository.revoke(inviteId, revokedById, requestLog);

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
