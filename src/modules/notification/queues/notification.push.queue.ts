import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    NotificationReferenceJobIdPattern,
    NotificationUserJobIdPattern,
    NotificationWorkspaceUserJobIdPattern,
} from '@modules/notification/constants/notification.constant';
import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenPayload,
    INotificationPushQueuePayload,
    INotificationSendPushPayload,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues push notification jobs (FCM) onto the push queue, deduplicated per user.
 */
@Injectable()
export class NotificationPushQueue {
    private readonly defTz: string;
    private readonly dedupTtlInMs: number;
    private readonly cleanupDedupTtlInMs: number;
    private readonly cleanupStaleTokensCron: string;

    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        private readonly notificationPushQueue: Queue,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.defTz = this.configService.get<string>('app.timezone')!;
        this.dedupTtlInMs = this.configService.get<number>(
            'notification.dedupTtlInMs'
        )!;
        this.cleanupDedupTtlInMs = this.configService.get<number>(
            'notification.push.cleanupDedupTtlInMs'
        )!;
        this.cleanupStaleTokensCron = this.configService.get<string>(
            'notification.push.cleanupStaleTokensCron'
        )!;
    }

    async sendTemporaryPasswordByAdmin(
        sendPayload: INotificationSendPushPayload,
        {
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationTemporaryPasswordPushPayload> =
            {
                send: sendPayload,
                data: { passwordCreatedAt, passwordExpiredAt },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.temporaryPasswordByAdmin,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.temporaryPasswordByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendResetPassword(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload = {
            send: sendPayload,
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.resetPassword,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.resetPassword,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendResetTwoFactorByAdmin(
        sendPayload: INotificationSendPushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload = {
            send: sendPayload,
            data: null,
        };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.resetTwoFactorByAdmin,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.resetTwoFactorByAdmin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendNewDeviceLogin(
        sendPayload: INotificationSendPushPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationNewDeviceLoginPayload> =
            {
                send: sendPayload,
                data,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.newDeviceLogin,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.newDeviceLogin,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceInvite(
        sendPayload: INotificationSendPushPayload,
        {
            workspaceId,
            workspaceName,
            inviterName,
            workspaceMemberRole,
            reference,
            expiredAt,
        }: INotificationWorkspaceInvitePushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceInvitePushPayload> =
            {
                send: sendPayload,
                data: {
                    workspaceId,
                    workspaceName,
                    inviterName,
                    workspaceMemberRole,
                    reference,
                    expiredAt,
                },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationReferenceJobIdPattern,
            {
                process: EnumNotificationPushProcess.workspaceInvite,
                reference,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.workspaceInvite,
            payload,
            {
                priority: EnumQueuePriority.high,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinRequest(
        sendPayload: INotificationSendPushPayload,
        {
            workspaceId,
            workspaceName,
            requesterName,
        }: INotificationWorkspaceJoinRequestPushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPushPayload> =
            {
                send: sendPayload,
                data: { workspaceId, workspaceName, requesterName },
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.workspaceJoinRequest,
                workspaceId,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.workspaceJoinRequest,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinAccepted(
        sendPayload: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                send: sendPayload,
                data,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.workspaceJoinAccepted,
                workspaceId: data.workspaceId,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.workspaceJoinAccepted,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendWorkspaceJoinRejected(
        sendPayload: INotificationSendPushPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                send: sendPayload,
                data,
            };

        const deduplicationId = this.helperStringService.fillPattern(
            NotificationWorkspaceUserJobIdPattern,
            {
                process: EnumNotificationPushProcess.workspaceJoinRejected,
                workspaceId: data.workspaceId,
                userId: sendPayload.userId,
            }
        );

        await this.notificationPushQueue.add(
            EnumNotificationPushProcess.workspaceJoinRejected,
            payload,
            {
                priority: EnumQueuePriority.medium,
                deduplication: {
                    id: deduplicationId,
                    ttl: this.dedupTtlInMs,
                },
            }
        );
    }

    async sendCleanupTokens(
        userId: string,
        failureTokens: string[]
    ): Promise<void> {
        if (failureTokens.length > 0) {
            const payload: INotificationPushCleanupTokenPayload = {
                failureTokens,
                userId,
            };

            const deduplicationId = this.helperStringService.fillPattern(
                NotificationUserJobIdPattern,
                {
                    process: EnumNotificationPushProcess.cleanupTokens,
                    userId,
                }
            );

            await this.notificationPushQueue.add(
                EnumNotificationPushProcess.cleanupTokens,
                payload,
                {
                    priority: EnumQueuePriority.low,
                    deduplication: {
                        id: deduplicationId,
                        ttl: this.cleanupDedupTtlInMs,
                    },
                }
            );
        }
    }

    async sendCleanupStaleTokens(): Promise<void> {
        await this.notificationPushQueue.upsertJobScheduler(
            EnumNotificationPushProcess.cleanupStaleTokens,
            {
                pattern: this.cleanupStaleTokensCron,
                tz: this.defTz,
            },
            {
                name: EnumNotificationPushProcess.cleanupStaleTokens,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }
}
