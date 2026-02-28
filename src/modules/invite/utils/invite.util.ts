import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { HelperService } from '@common/helper/services/helper.service';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InviteConfigDto } from '@modules/invite/dtos/invite.config.dto';
import {
    InviteConfig,
    InviteConfigOverride,
    InviteTokenPayload,
} from '@modules/invite/interfaces/invite.interface';
import { ConfigService } from '@nestjs/config';
import { Invite as InviteModel, Prisma, User } from '@prisma/client';
import { Duration } from 'luxon';
import { ValidationError, validateSync } from 'class-validator';

function collectValidationMessages(
    errors: ValidationError[],
    parentPath = ''
): string[] {
    const messages: string[] = [];

    for (const error of errors) {
        const currentPath = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;

        if (error.constraints) {
            for (const constraint of Object.values(error.constraints)) {
                messages.push(`${currentPath}: ${constraint}`);
            }
        }

        if (error.children?.length) {
            messages.push(
                ...collectValidationMessages(error.children, currentPath)
            );
        }
    }

    return messages;
}

export function mergeInviteConfig(
    defaults: InviteConfig,
    override?: InviteConfigOverride
): InviteConfig {
    return {
        expiredInMinutes:
            override?.expiredInMinutes ?? defaults.expiredInMinutes,
        tokenLength: override?.tokenLength ?? defaults.tokenLength,
        linkBaseUrl: override?.linkBaseUrl ?? defaults.linkBaseUrl,
        resendInMinutes: override?.resendInMinutes ?? defaults.resendInMinutes,
        reference: {
            prefix: override?.reference?.prefix ?? defaults.reference.prefix,
            length: override?.reference?.length ?? defaults.reference.length,
        },
    };
}

export function validateInviteConfig(
    config: InviteConfig,
    invitationType: string
): void {
    const payload = plainToInstance(InviteConfigDto, config);
    const errors = validateSync(payload, {
        whitelist: true,
        forbidNonWhitelisted: false,
    });

    if (!errors.length) {
        return;
    }

    const messages = collectValidationMessages(errors);
    throw new Error(
        `Invalid invite config for "${invitationType}": ${messages.join('; ')}`
    );
}

@Injectable()
export class InviteUtil {
    private readonly homeUrl: string;

    constructor(
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.homeUrl = this.configService.get<string>('home.url');
    }

    private toMetadataObject(
        metadata: Prisma.JsonValue | null
    ): Record<string, unknown> | null {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            return null;
        }

        return metadata as Record<string, unknown>;
    }

    inviteCreateReference(config: InviteConfig): string {
        const random = this.helperService.randomString(
            config.reference.length
        );

        return `${config.reference.prefix}-${random}`;
    }

    inviteCreateToken(config: InviteConfig): string {
        return this.helperService.randomString(config.tokenLength);
    }

    inviteSetExpiredDate(config: InviteConfig): Date {
        const now = this.helperService.dateCreate();

        return this.helperService.dateForward(
            now,
            Duration.fromObject({ minutes: config.expiredInMinutes })
        );
    }

    createInviteTokenPayload(config: InviteConfig): InviteTokenPayload {
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

    createInviteLink(token: string, config: InviteConfig): string {
        return `${this.homeUrl}/${config.linkBaseUrl}/${token}`;
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
