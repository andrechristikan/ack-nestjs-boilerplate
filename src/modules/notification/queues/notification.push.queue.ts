import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import {
    EnumNotificationPushProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenEncryptedPayload,
    INotificationPushQueuePayload,
    INotificationSendPushEncryptedPayload,
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
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Enqueues push notification jobs (FCM) onto the push queue under a fixed job id.
 */
@Injectable()
export class NotificationPushQueue extends QueueBase {
    private readonly defTz: string;
    private readonly cleanupStaleTokensCron: string;
    private readonly stepJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.notificationPush)
        protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        super(queue, sentryService);
        this.defTz = this.configService.get<string>('app.timezone')!;
        this.cleanupStaleTokensCron = this.configService.get<string>(
            'notification.push.cleanupStaleTokensCron'
        )!;
        this.stepJobIdPattern = this.configService.get<string>(
            'notification.jobId.stepPattern'
        )!;
    }

    async sendTemporaryPasswordByAdmin(
        sendPayload: INotificationSendPushEncryptedPayload,
        {
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPushPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationTemporaryPasswordPushPayload> =
            {
                send: sendPayload,
                data: { passwordCreatedAt, passwordExpiredAt },
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.temporaryPasswordByAdmin,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendResetPassword(
        sendPayload: INotificationSendPushEncryptedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload = {
            send: sendPayload,
            data: null,
            completedSteps: [],
            encryptedFailureTokens: null,
            encryptedPendingTokens: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.resetPassword,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendForgotPassword(
        sendPayload: INotificationSendPushEncryptedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload = {
            send: sendPayload,
            data: null,
            completedSteps: [],
            encryptedFailureTokens: null,
            encryptedPendingTokens: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.forgotPassword,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendResetTwoFactorByAdmin(
        sendPayload: INotificationSendPushEncryptedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload = {
            send: sendPayload,
            data: null,
            completedSteps: [],
            encryptedFailureTokens: null,
            encryptedPendingTokens: null,
        };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.resetTwoFactorByAdmin,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendNewDeviceLogin(
        sendPayload: INotificationSendPushEncryptedPayload,
        data: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationNewDeviceLoginPayload> =
            {
                send: sendPayload,
                data,
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.newDeviceLogin,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendWorkspaceInvite(
        sendPayload: INotificationSendPushEncryptedPayload,
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
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.workspaceInvite,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendWorkspaceJoinRequest(
        sendPayload: INotificationSendPushEncryptedPayload,
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
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.workspaceJoinRequest,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendWorkspaceJoinAccepted(
        sendPayload: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceJoinAcceptedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload> =
            {
                send: sendPayload,
                data,
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.workspaceJoinAccepted,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendWorkspaceJoinRejected(
        sendPayload: INotificationSendPushEncryptedPayload,
        data: INotificationWorkspaceJoinRejectedPayload
    ): Promise<void> {
        const payload: INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload> =
            {
                send: sendPayload,
                data,
                completedSteps: [],
                encryptedFailureTokens: null,
                encryptedPendingTokens: null,
            };

        const jobId = this.helperStringService.fillPattern(
            this.stepJobIdPattern,
            {
                notificationId: sendPayload.notificationId,
                step: EnumNotificationStep.sendPush,
            }
        );

        await this.queue.add(
            EnumNotificationPushProcess.workspaceJoinRejected,
            payload,
            {
                jobId,
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendCleanupTokens(
        notificationId: string,
        userId: string,
        encryptedFailureTokens: string[]
    ): Promise<void> {
        if (encryptedFailureTokens.length > 0) {
            const payload: INotificationPushCleanupTokenEncryptedPayload = {
                encryptedFailureTokens,
                userId,
            };

            const jobId = this.helperStringService.fillPattern(
                this.stepJobIdPattern,
                {
                    notificationId,
                    step: EnumNotificationStep.cleanupTokens,
                }
            );

            await this.queue.add(
                EnumNotificationPushProcess.cleanupTokens,
                payload,
                {
                    jobId,
                    priority: EnumQueuePriority.low,
                }
            );
        }
    }

    async sendCleanupStaleTokens(): Promise<void> {
        await this.queue.upsertJobScheduler(
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
