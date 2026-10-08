import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationStepResult,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWelcomeEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationProcessorService {
    constructor(
        private readonly notificationAccountDomain: NotificationAccountDomain,
        private readonly notificationSecurityDomain: NotificationSecurityDomain,
        private readonly notificationTermPolicyDomain: NotificationTermPolicyDomain,
        private readonly notificationWorkspaceDomain: NotificationWorkspaceDomain,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async recordSteps<T>(
        job: Job<
            INotificationQueuePayload<T>,
            unknown,
            EnumNotificationProcess
        >,
        result: INotificationStepResult
    ): Promise<IQueueResponse> {
        await job.updateData({
            ...job.data,
            completedSteps: result.completedSteps,
        });
        if (result.failedSteps.length > 0) {
            const summary = this.notificationUtil.toStepSummary(
                result.failedSteps
            );
            throw new QueueException(summary, true);
        }

        return this.notificationUtil.toStepResponse(result);
    }

    async processWelcomeByAdmin(
        job: Job<
            INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { proceedBy, userId, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationAccountDomain.processWelcomeByAdmin(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processWelcome(
        job: Job<
            INotificationQueuePayload<INotificationWelcomeEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const { verificationNotificationId, ...verification } = data;
        const result = await this.notificationAccountDomain.processWelcome(
            userId,
            verification,
            notificationId,
            verificationNotificationId,
            completedSteps
        );

        return this.recordSteps(job, result);
    }

    async processWelcomeSocial(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationAccountDomain.processWelcomeSocial(
                userId,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processVerifiedEmail(
        job: Job<
            INotificationQueuePayload<INotificationVerifiedEmailPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationAccountDomain.processVerifiedEmail(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processVerificationEmail(
        job: Job<
            INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationAccountDomain.processVerificationEmail(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processVerifiedMobileNumber(
        job: Job<
            INotificationQueuePayload<INotificationVerifiedMobileNumberPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationAccountDomain.processVerifiedMobileNumber(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processTemporaryPasswordByAdmin(
        job: Job<
            INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { proceedBy, userId, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationSecurityDomain.processTemporaryPasswordByAdmin(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processChangePassword(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationSecurityDomain.processChangePassword(
                userId,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processForgotPassword(
        job: Job<
            INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationSecurityDomain.processForgotPassword(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processResetPassword(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationSecurityDomain.processResetPassword(
                userId,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processResetTwoFactorByAdmin(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationSecurityDomain.processResetTwoFactorByAdmin(
                userId,
                proceedBy,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processNewDeviceLogin(
        job: Job<
            INotificationQueuePayload<INotificationNewDeviceLoginPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationSecurityDomain.processNewDeviceLogin(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processPublishTermPolicy({
        data: { data, proceedBy },
    }: Job<
        INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationTermPolicyDomain.processPublishTermPolicy(
            proceedBy,
            data
        );
    }

    async processUserAcceptTermPolicy(
        job: Job<
            INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps } = job.data;
        const result =
            await this.notificationTermPolicyDomain.processUserAcceptTermPolicy(
                userId,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceInvite(
        job: Job<
            INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceInvite(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinRequest(
        job: Job<
            INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinRequest(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinAccepted(
        job: Job<
            INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinAccepted(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processWorkspaceJoinRejected(
        job: Job<
            INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, data, notificationId, completedSteps } =
            job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinRejected(
                userId,
                proceedBy,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }
}
