import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ConfigService } from '@nestjs/config';
import { ITenantConfig } from '@configs/tenant.config';
import { TenantInviteCreateRequestDto } from '@modules/tenant/dtos/request/tenant-invite.create.request.dto';
import { TenantInviteResponseDto } from '@modules/tenant/dtos/response/tenant-invite.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { ITenantInviteService } from '@modules/tenant/interfaces/tenant-invite.service.interface';
import { TenantInviteRepository } from '@modules/tenant/repositories/tenant-invite.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import {
    EnumTenantInviteStatus,
    EnumTenantInviteType,
    EnumTenantMemberRole,
    EnumUserSignUpFrom,
    Prisma,
    TenantInvite,
} from '@generated/prisma-client';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TenantInviteService implements ITenantInviteService {
    private readonly defaultInviteExpiresInDays: number;

    constructor(
        private readonly tenantInviteRepository: TenantInviteRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService,
        private readonly authUtil: AuthUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.defaultInviteExpiresInDays = this.configService.get<ITenantConfig['invite']>(
            'tenant.invite'
        ).expiresInDays;
    }

    private mapToResponseDto(invite: TenantInvite): TenantInviteResponseDto {
        const now = this.helperService.dateCreate();
        const effectiveStatus =
            invite.status === EnumTenantInviteStatus.pending &&
            invite.expiresAt <= now
                ? EnumTenantInviteStatus.expired
                : invite.status;

        const dto = plainToInstance(TenantInviteResponseDto, {
            ...invite,
            status: effectiveStatus,
        });

        if (
            effectiveStatus === EnumTenantInviteStatus.pending &&
            invite.expiresAt > now
        ) {
            dto.remainingSeconds = Math.floor(
                (invite.expiresAt.getTime() - now.getTime()) / 1000
            );
        }

        return dto;
    }

    async createInvite(
        tenantId: string,
        dto: TenantInviteCreateRequestDto,
        invitedById: string,
        _requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantInviteResponseDto>> {
        if (dto.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.tenantInviteOwnerForbidden,
                message: 'tenant.invite.error.ownerRoleForbidden',
            });
        }

        const tenant = await this.tenantRepository.findOneById(tenantId);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.notFound,
                message: 'tenant.error.notFound',
            });
        }

        const existingUser = await this.userRepository.findOneByEmail(dto.email);
        const type = existingUser
            ? EnumTenantInviteType.registered
            : EnumTenantInviteType.unregistered;

        // Revoke existing pending invite for same email+tenant
        const existingPending =
            await this.tenantInviteRepository.findOnePendingByEmailAndTenant(
                dto.email,
                tenantId
            );
        if (existingPending) {
            await this.tenantInviteRepository.revoke(existingPending.id, invitedById);
        }

        const expiresInDays = dto.expiresInDays ?? this.defaultInviteExpiresInDays;
        const now = this.helperService.dateCreate();
        const expiresAt = this.helperService.dateForward(
            now,
            this.helperService.dateCreateDuration({ days: expiresInDays })
        );
        const token = this.helperService.randomString(64);

        const invite = await this.tenantInviteRepository.create({
            tenantId,
            invitedById,
            invitedEmail: dto.email,
            tenantRole: dto.role,
            type,
            token,
            expiresAt,
            createdBy: invitedById,
            updatedBy: invitedById,
        });

        this.notificationUtil.sendTenantInvite(
            dto.email,
            {
                tenantName: tenant.name,
                token,
                expiresAt,
                role: dto.role,
            },
            invitedById,
            type === EnumTenantInviteType.registered ? existingUser?.id : undefined
        );

        return { data: this.mapToResponseDto(invite) };
    }

    async claimRegistered(token: string, requestLog: IRequestLog): Promise<void> {
        const invite =
            await this.tenantInviteRepository.findOneActiveByToken(token);
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.tenantInviteTokenInvalid,
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

        await this.tenantInviteRepository.acceptAndCreateMembership(
            invite.id,
            user.id,
            invite.tenantId,
            invite.tenantRole,
            requestLog
        );
    }

    async signupAndClaim(
        token: string,
        firstName: string,
        lastName: string,
        password: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite =
            await this.tenantInviteRepository.findOneActiveByToken(token);
        if (!invite) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.tenantInviteTokenInvalid,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        if (invite.type !== EnumTenantInviteType.unregistered) {
            throw new UnprocessableEntityException({
                statusCode: EnumTenantStatusCodeError.tenantInviteTokenInvalid,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        // TODO: We need to wrap this in try-catch and perform db ops under a single transaction
        const stubUser = await this.userService.createForInvitation(
            invite.invitedEmail,
            EnumUserSignUpFrom.tenant,
            requestLog,
            invite.invitedById
        );

        const name = `${firstName.trim()} ${lastName.trim()}`.trim();
        const passwordPayload = this.authUtil.createPassword(stubUser.id, password);

        await this.tenantInviteRepository.signupAndAccept(
            invite.id,
            stubUser.id,
            invite.tenantId,
            invite.tenantRole,
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
                statusCode: EnumTenantStatusCodeError.inviteNotFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        if (invite.status === EnumTenantInviteStatus.accepted) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.tenantInviteAlreadyAccepted,
                message: 'tenant.invite.error.alreadyAccepted',
            });
        }

        if (invite.status === EnumTenantInviteStatus.revoked) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.tenantInviteRevoked,
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
                statusCode: EnumTenantStatusCodeError.inviteNotFound,
                message: 'tenant.invite.error.tokenInvalid',
            });
        }

        return { data: this.mapToResponseDto(invite) };
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
            data: data.map(invite => this.mapToResponseDto(invite)),
        };
    }
}
