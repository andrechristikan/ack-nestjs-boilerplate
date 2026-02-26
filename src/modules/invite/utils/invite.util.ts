import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InviteTokenPayload } from '@modules/invite/interfaces/invite.interface';
import { ConfigService } from '@nestjs/config';
import { Invite as InviteModel, Prisma, User } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class InviteUtil {
    private readonly homeUrl: string;
    private readonly inviteReferencePrefix: string;
    private readonly inviteReferenceLength: number;
    readonly inviteExpiredInMinutes: number;
    private readonly inviteTokenLength: number;
    readonly inviteResendInMinutes: number;
    private readonly inviteLinkBaseUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
        this.inviteReferencePrefix = this.configService.get(
            'invite.reference.prefix'
        );
        this.inviteReferenceLength = this.configService.get(
            'invite.reference.length'
        );
        this.inviteExpiredInMinutes = this.configService.get(
            'invite.expiredInMinutes'
        );
        this.inviteTokenLength = this.configService.get(
            'invite.tokenLength'
        );
        this.inviteResendInMinutes = this.configService.get(
            'invite.resendInMinutes'
        );
        this.inviteLinkBaseUrl = this.configService.get<string>(
            'invite.linkBaseUrl'
        );
    }

    private toMetadataObject(
        metadata: Prisma.JsonValue | null
    ): Record<string, unknown> | null {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            return null;
        }

        return metadata as Record<string, unknown>;
    }

    inviteCreateReference(): string {
        const random = this.helperService.randomString(
            this.inviteReferenceLength
        );

        return `${this.inviteReferencePrefix}-${random}`;
    }

    inviteCreateToken(): string {
        return this.helperService.randomString(this.inviteTokenLength);
    }

    inviteSetExpiredDate(): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.inviteExpiredInMinutes })
        );
    }

    createInviteTokenPayload(): InviteTokenPayload {
        const token = this.inviteCreateToken();

        return {
            reference: this.inviteCreateReference(),
            expiresAt: this.inviteSetExpiredDate(),
            token,
            expiredInMinutes: this.inviteExpiredInMinutes,
            resendInMinutes: this.inviteResendInMinutes,
            link: `${this.homeUrl}/${this.inviteLinkBaseUrl}/${token}`,
        };
    }

    createInviteLink(token: string): string {
        return `${this.homeUrl}/${this.inviteLinkBaseUrl}/${token}`;
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

    mapListItem(
        v: InviteModel & { user: User }
    ): InviteListResponseDto {
        return plainToInstance(InviteListResponseDto, {
            id: v.id,
            userId: v.userId,
            email: v.to,
            status: this.mapInviteStatus({
                expiresAt: v.expiresAt,
                sentAt: v.sentAt,
                acceptedAt: v.acceptedAt,
                deletedAt: v.deletedAt,
            }),
            metadata: this.toMetadataObject(v.metadata),
            createdAt: v.createdAt,
        });
    }

    mapList(
        invites: (InviteModel & { user: User })[]
    ): InviteListResponseDto[] {
        return invites.map(v => this.mapListItem(v));
    }
}
