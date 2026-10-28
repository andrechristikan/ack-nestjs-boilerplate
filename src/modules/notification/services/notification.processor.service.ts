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
import { MessageService } from '@common/message/services/message.service';

@Injectable()
export class NotificationProcessorService {
    constructor(
        private readonly notificationAccountDomain: NotificationAccountDomain,
        private readonly notificationSecurityDomain: NotificationSecurityDomain,
        private readonly notificationTermPolicyDomain: NotificationTermPolicyDomain,
        private readonly notificationWorkspaceDomain: NotificationWorkspaceDomain,
        private readonly notificationUtil: NotificationUtil,
        private readonly messageService: MessageService
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
        const {
            proceedBy,
            userId,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationAccountDomain.processWelcomeByAdmin(
                userId,
                proceedBy,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const { verificationNotificationId, ...verification } = data;
        const result = await this.notificationAccountDomain.processWelcome(
            userId,
            recipient,
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
        const { userId, notificationId, completedSteps, recipient } = job.data;
        const result =
            await this.notificationAccountDomain.processWelcomeSocial(
                userId,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationAccountDomain.processVerifiedEmail(
                userId,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationAccountDomain.processVerificationEmail(
                userId,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationAccountDomain.processVerifiedMobileNumber(
                userId,
                recipient,
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
        const {
            proceedBy,
            userId,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationSecurityDomain.processTemporaryPasswordByAdmin(
                userId,
                proceedBy,
                recipient,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processChangePassword(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps, recipient } = job.data;
        const result =
            await this.notificationSecurityDomain.processChangePassword(
                userId,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationSecurityDomain.processForgotPassword(
                userId,
                recipient,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processResetPassword(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps, recipient } = job.data;
        const result =
            await this.notificationSecurityDomain.processResetPassword(
                userId,
                recipient,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }

    async processResetTwoFactorByAdmin(
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, proceedBy, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationSecurityDomain.processResetTwoFactorByAdmin(
                userId,
                proceedBy,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationSecurityDomain.processNewDeviceLogin(
                userId,
                recipient,
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
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationTermPolicyDomain.processUserAcceptTermPolicy(
                userId,
                recipient,
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
        const {
            userId,
            proceedBy,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceInvite(
                userId,
                proceedBy,
                recipient,
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
        const {
            userId,
            proceedBy,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinRequest(
                userId,
                proceedBy,
                recipient,
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
        const {
            userId,
            proceedBy,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinAccepted(
                userId,
                proceedBy,
                recipient,
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
        const {
            userId,
            proceedBy,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationWorkspaceDomain.processWorkspaceJoinRejected(
                userId,
                proceedBy,
                recipient,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }
    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'notification.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}
