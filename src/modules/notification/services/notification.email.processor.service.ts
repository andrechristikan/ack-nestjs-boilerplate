import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationEmailBulkQueuePayload,
    INotificationEmailQueuePayload,
    INotificationEmailUnregisteredQueuePayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceInviteUnregisteredPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailAccountDomain } from '@modules/notification/domains/notification.email.account.domain';
import { NotificationEmailSecurityDomain } from '@modules/notification/domains/notification.email.security.domain';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { NotificationEmailWorkspaceDomain } from '@modules/notification/domains/notification.email.workspace.domain';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationEmailProcessorService {
    constructor(
        private readonly notificationEmailAccountDomain: NotificationEmailAccountDomain,
        private readonly notificationEmailSecurityDomain: NotificationEmailSecurityDomain,
        private readonly notificationEmailTermPolicyDomain: NotificationEmailTermPolicyDomain,
        private readonly notificationEmailWorkspaceDomain: NotificationEmailWorkspaceDomain
    ) {}

    async processWelcome(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processWelcome(
            job.data.send
        );
    }

    async processWelcomeSocial(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processWelcomeSocial(
            job.data.send
        );
    }

    async processWelcomeByAdmin(
        job: Job<
            INotificationEmailQueuePayload<INotificationWelcomeByAdminPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processWelcomeByAdmin(
            job.data.send,
            job.data.data!
        );
    }

    async processTemporaryPasswordByAdmin(
        job: Job<
            INotificationEmailQueuePayload<INotificationTemporaryPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processTemporaryPasswordByAdmin(
            job.data.send,
            job.data.data!
        );
    }

    async processChangePassword(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processChangePassword(
            job.data.send
        );
    }

    async processResetPassword(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processResetPassword(
            job.data.send
        );
    }

    async processVerificationEmail(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerificationEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processVerificationEmail(
            job.data.send,
            job.data.data!
        );
    }

    async processVerifiedEmail(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processVerifiedEmail(
            job.data.send,
            job.data.data!
        );
    }

    async processForgotPassword(
        job: Job<
            INotificationEmailQueuePayload<INotificationForgotPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processForgotPassword(
            job.data.send,
            job.data.data!
        );
    }

    async processVerifiedMobileNumber(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountDomain.processVerifiedMobileNumber(
            job.data.send,
            job.data.data!
        );
    }

    async processResetTwoFactorByAdmin(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processResetTwoFactorByAdmin(
            job.data.send
        );
    }

    async processNewDeviceLogin(
        job: Job<
            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailSecurityDomain.processNewDeviceLogin(
            job.data.send,
            job.data.data!
        );
    }

    async processPublishTermPolicy(
        job: Job<
            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailTermPolicyDomain.processPublishTermPolicy(
            job.data.data!
        );
    }

    async processWorkspaceInvite(
        job: Job<
            INotificationEmailQueuePayload<INotificationWorkspaceInvitePayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceDomain.processWorkspaceInvite(
            job.data.send,
            job.data.data!
        );
    }

    async processWorkspaceInviteUnregistered(
        job: Job<
            INotificationEmailUnregisteredQueuePayload<INotificationWorkspaceInviteUnregisteredPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceDomain.processWorkspaceInviteUnregistered(
            job.data.send,
            job.data.data!
        );
    }

    async processWorkspaceJoinRequest(
        job: Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRequestPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceDomain.processWorkspaceJoinRequest(
            job.data.send,
            job.data.data!
        );
    }

    async processWorkspaceJoinAccepted(
        job: Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceDomain.processWorkspaceJoinAccepted(
            job.data.send,
            job.data.data!
        );
    }

    async processWorkspaceJoinRejected(
        job: Job<
            INotificationEmailQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailWorkspaceDomain.processWorkspaceJoinRejected(
            job.data.send,
            job.data.data!
        );
    }
}
