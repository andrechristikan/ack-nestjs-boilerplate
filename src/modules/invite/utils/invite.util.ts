import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';
import { InviteConfig, InviteTokenCreate } from '@modules/invite/interfaces/invite.interface';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class InviteUtil {
    private readonly homeUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
    }

    inviteCreateReference(
        config: Pick<InviteConfig, 'reference'>
    ): string {
        const random = this.helperService.randomString(config.reference.length);

        return `${config.reference.prefix}-${random}`;
    }

    inviteCreateToken(config: Pick<InviteConfig, 'tokenLength'>): string {
        return this.helperService.randomString(config.tokenLength);
    }

    inviteSetExpiredDate(
        config: Pick<InviteConfig, 'expiredInMinutes'>
    ): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: config.expiredInMinutes })
        );
    }

    createInviteToken(config: InviteConfig): InviteTokenCreate {
        const token = this.inviteCreateToken(config);

        return {
            reference: this.inviteCreateReference(config),
            expiresAt: this.inviteSetExpiredDate(config),
            token,
            expiredInMinutes: config.expiredInMinutes,
            resendInMinutes: config.resendInMinutes,
            link: `${this.homeUrl}/${config.linkBaseUrl}/${token}`,
        };
    }

    createInviteLink(
        token: string,
        config: Pick<InviteConfig, 'linkBaseUrl'>
    ): string {
        return `${this.homeUrl}/${config.linkBaseUrl}/${token}`;
    }

    inviteRemainingSeconds(expiresAt: Date): number {
        return this.helperService
            .dateDiff(expiresAt, this.helperService.dateCreate())
            .as('seconds');
    }

    mapInviteStatus(invite?: {
        expiresAt?: Date;
        sentAt?: Date | null;
        acceptedAt?: Date | null;
        deletedAt?: Date | null;
    }): InviteStatusResponseDto {
        if (invite?.deletedAt) {
            return plainToInstance(InviteStatusResponseDto, {
                status: 'deleted',
                sentAt: invite.sentAt ?? undefined,
                deletedAt: invite.deletedAt,
            });
        }

        if (!invite?.expiresAt) {
            return plainToInstance(InviteStatusResponseDto, {
                status: 'not_sent',
            });
        }

        if (invite.acceptedAt) {
            return plainToInstance(InviteStatusResponseDto, {
                status: 'completed',
                completedAt: invite.acceptedAt,
            });
        }

        const now = Date.now();
        if (invite.expiresAt.getTime() <= now) {
            return plainToInstance(InviteStatusResponseDto, {
                status: 'expired',
                expiresAt: invite.expiresAt,
                sentAt: invite.sentAt ?? undefined,
            });
        }

        return plainToInstance(InviteStatusResponseDto, {
            status: 'pending',
            expiresAt: invite.expiresAt,
            sentAt: invite.sentAt ?? undefined,
            remainingSeconds: Math.max(
                0,
                Math.floor((invite.expiresAt.getTime() - now) / 1000)
            ),
        });
    }
}
