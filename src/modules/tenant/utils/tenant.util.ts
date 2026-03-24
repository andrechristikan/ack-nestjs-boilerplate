import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { plainToInstance } from 'class-transformer';
import {
    InviteConfig,
    InviteTokenCreate,
} from '@modules/invite/interfaces/invite.interface';
import { TenantInviteStatusResponseDto } from '@modules/tenant/dtos/response/tenant-invite-status.response.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';
import { EnumTenantInviteStatus } from '@generated/prisma-client';
import { Duration } from 'luxon';

@Injectable()
export class TenantUtil {
    private readonly homeUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
    }

    createSlug(value: string): string {
        return this.helperService.createSlug(value);
    }

    createDefaultName(name: string | undefined, email: string): string {
        const cleanName = name?.trim();
        if (cleanName) {
            return `${cleanName} Workspace`;
        }

        const username = email.split('@')[0]?.trim() || 'workspace';
        return `${username} Workspace`;
    }

    mapTenant(tenant: ITenant): TenantResponseDto {
        return plainToInstance(TenantResponseDto, tenant);
    }

    mapMember(member: ITenantMember): TenantMemberResponseDto {
        return plainToInstance(TenantMemberResponseDto, member);
    }

    private inviteCreateReference(prefix: string, length: number): string {
        const random = this.helperService.randomString(length);
        return `${prefix}-${random}`;
    }

    private inviteCreateToken(length: number): string {
        return this.helperService.randomString(length);
    }

    private inviteSetExpiredDate(expiredInMinutes: number): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: expiredInMinutes })
        );
    }

    createInviteToken(config: InviteConfig): InviteTokenCreate {
        const token = this.inviteCreateToken(config.tokenLength);

        return {
            reference: this.inviteCreateReference(
                config.reference.prefix,
                config.reference.length
            ),
            expiresAt: this.inviteSetExpiredDate(config.expiredInMinutes),
            token,
            expiredInMinutes: config.expiredInMinutes,
            resendInMinutes: config.resendInMinutes,
            link: `${this.homeUrl}/${config.linkBaseUrl}/${token}`,
        };
    }

    inviteRemainingSeconds(expiresAt: Date): number {
        return this.helperService
            .dateDiff(expiresAt, this.helperService.dateCreate())
            .as('seconds');
    }

    mapInviteStatus(invite: {
        status: EnumTenantInviteStatus;
        expiresAt?: Date | null;
        sentAt?: Date | null;
        acceptedAt?: Date | null;
        revokedAt?: Date | null;
    }): TenantInviteStatusResponseDto {
        const remainingSeconds =
            invite.status === EnumTenantInviteStatus.pending && invite.expiresAt
                ? Math.max(
                      0,
                      Math.floor(this.inviteRemainingSeconds(invite.expiresAt))
                  )
                : undefined;

        return plainToInstance(TenantInviteStatusResponseDto, {
            status: invite.status,
            expiresAt: invite.expiresAt ?? undefined,
            sentAt: invite.sentAt ?? undefined,
            acceptedAt: invite.acceptedAt ?? undefined,
            revokedAt: invite.revokedAt ?? undefined,
            remainingSeconds,
        });
    }
}
