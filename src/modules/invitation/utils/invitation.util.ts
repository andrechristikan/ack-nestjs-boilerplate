import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';
import { InvitationListResponseDto } from '@modules/invitation/dtos/response/invitation-list.response.dto';
import { InvitationTokenPayload } from '@modules/invitation/interfaces/invitation.interface';
import { ConfigService } from '@nestjs/config';
import { Invitation as InvitationModel, Prisma, User } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class InvitationUtil {
    private readonly homeUrl: string;
    private readonly invitationReferencePrefix: string;
    private readonly invitationReferenceLength: number;
    readonly invitationExpiredInMinutes: number;
    private readonly invitationTokenLength: number;
    readonly invitationResendInMinutes: number;
    private readonly invitationLinkBaseUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
        this.invitationReferencePrefix = this.configService.get(
            'invitation.reference.prefix'
        );
        this.invitationReferenceLength = this.configService.get(
            'invitation.reference.length'
        );
        this.invitationExpiredInMinutes = this.configService.get(
            'invitation.expiredInMinutes'
        );
        this.invitationTokenLength = this.configService.get(
            'invitation.tokenLength'
        );
        this.invitationResendInMinutes = this.configService.get(
            'invitation.resendInMinutes'
        );
        this.invitationLinkBaseUrl = this.configService.get<string>(
            'invitation.linkBaseUrl'
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

    invitationCreateReference(): string {
        const random = this.helperService.randomString(
            this.invitationReferenceLength
        );

        return `${this.invitationReferencePrefix}-${random}`;
    }

    invitationCreateToken(): string {
        return this.helperService.randomString(this.invitationTokenLength);
    }

    invitationSetExpiredDate(): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: this.invitationExpiredInMinutes })
        );
    }

    createInvitationTokenPayload(): InvitationTokenPayload {
        const token = this.invitationCreateToken();

        return {
            reference: this.invitationCreateReference(),
            expiresAt: this.invitationSetExpiredDate(),
            token,
            expiredInMinutes: this.invitationExpiredInMinutes,
            resendInMinutes: this.invitationResendInMinutes,
            link: `${this.homeUrl}/${this.invitationLinkBaseUrl}/${token}`,
        };
    }

    createInvitationLink(token: string): string {
        return `${this.homeUrl}/${this.invitationLinkBaseUrl}/${token}`;
    }

    mapInvitationStatus(invitation?: {
        expiresAt?: Date;
        sentAt?: Date | null;
        acceptedAt?: Date | null;
        deletedAt?: Date | null;
    }): InvitationStatusResponseDto {
        if (invitation?.deletedAt) {
            return plainToInstance(InvitationStatusResponseDto, {
                status: 'deleted',
                sentAt: invitation.sentAt ?? undefined,
                deletedAt: invitation.deletedAt,
            });
        }

        if (!invitation?.expiresAt) {
            return plainToInstance(InvitationStatusResponseDto, {
                status: 'not_sent',
            });
        }

        if (invitation.acceptedAt) {
            return plainToInstance(InvitationStatusResponseDto, {
                status: 'completed',
                completedAt: invitation.acceptedAt,
            });
        }

        const now = Date.now();
        if (invitation.expiresAt.getTime() <= now) {
            return plainToInstance(InvitationStatusResponseDto, {
                status: 'expired',
                expiresAt: invitation.expiresAt,
                sentAt: invitation.sentAt ?? undefined,
            });
        }

        return plainToInstance(InvitationStatusResponseDto, {
            status: 'pending',
            expiresAt: invitation.expiresAt,
            sentAt: invitation.sentAt ?? undefined,
            remainingSeconds: Math.max(
                0,
                Math.floor((invitation.expiresAt.getTime() - now) / 1000)
            ),
        });
    }

    mapListItem(
        v: InvitationModel & { user: User }
    ): InvitationListResponseDto {
        return plainToInstance(InvitationListResponseDto, {
            id: v.id,
            userId: v.userId,
            email: v.to,
            status: this.mapInvitationStatus({
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
        invitations: (InvitationModel & { user: User })[]
    ): InvitationListResponseDto[] {
        return invitations.map(v => this.mapListItem(v));
    }
}
