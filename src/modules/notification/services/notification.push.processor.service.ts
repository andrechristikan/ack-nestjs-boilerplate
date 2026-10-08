import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenPayload,
    INotificationPushQueuePayload,
    INotificationPushStepResult,
    INotificationTemporaryPasswordPushPayload,
    INotificationWorkspaceInvitePushPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPushPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationPushProcessorService implements OnModuleInit {
    constructor(
        private readonly notificationPushSecurityDomain: NotificationPushSecurityDomain,
        private readonly notificationPushWorkspaceDomain: NotificationPushWorkspaceDomain,
        private readonly notificationPushMaintenanceDomain: NotificationPushMaintenanceDomain,
        private readonly notificationPushQueue: NotificationPushQueue,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async recordSteps<T>(
        job: Job<
            INotificationPushQueuePayload<T>,
            unknown,
            EnumNotificationPushProcess
        >,
        result: INotificationPushStepResult
    ): Promise<IQueueResponse> {
        await job.updateData({
            ...job.data,
            completedSteps: result.completedSteps,
            failureTokens: result.failureTokens,
        });
        if (result.failedSteps.length > 0) {
            const summary = this.notificationUtil.toStepSummary(
                result.failedSteps
            );
            throw new QueueException(summary, true);
        }

        return this.notificationUtil.toStepResponse(result);
    }

    async onModuleInit(): Promise<void> {
        await this.notificationPushQueue.sendCleanupStaleTokens();
    }

    async processNewDeviceLogin(
        job: Job<
            INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushSecurityDomain.processNewDeviceLogin(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processResetTwoFactorByAdmin(
        job: Job<
            INotificationPushQueuePayload,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushSecurityDomain.processResetTwoFactorByAdmin(
                send,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processTemporaryPasswordByAdmin(
        job: Job<
            INotificationPushQueuePayload<INotificationTemporaryPasswordPushPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushSecurityDomain.processTemporaryPasswordByAdmin(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processResetPassword(
        job: Job<
            INotificationPushQueuePayload,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushSecurityDomain.processResetPassword(
                send,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processForgotPassword(
        job: Job<
            INotificationPushQueuePayload,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushSecurityDomain.processForgotPassword(
                send,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceInvite(
        job: Job<
            INotificationPushQueuePayload<INotificationWorkspaceInvitePushPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushWorkspaceDomain.processWorkspaceInvite(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinRequest(
        job: Job<
            INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPushPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushWorkspaceDomain.processWorkspaceJoinRequest(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinAccepted(
        job: Job<
            INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushWorkspaceDomain.processWorkspaceJoinAccepted(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinRejected(
        job: Job<
            INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const { send, data, completedSteps, failureTokens } = job.data;
        const result =
            await this.notificationPushWorkspaceDomain.processWorkspaceJoinRejected(
                send,
                data,
                completedSteps,
                failureTokens
            );

        return this.recordSteps(job, result);
    }

    async processCleanupTokens({
        data: { userId, failureTokens },
    }: Job<
        INotificationPushCleanupTokenPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushMaintenanceDomain.processCleanupTokens(
            userId,
            failureTokens
        );
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        return this.notificationPushMaintenanceDomain.processCleanupStaleTokens();
    }
}
