import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { INotificationEmailProcessorService } from '@modules/notification/interfaces/notification.email.processor.service.interface';
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
import { NotificationEmailAccountService } from '@modules/notification/services/notification.email.account.service';
import { NotificationEmailSecurityService } from '@modules/notification/services/notification.email.security.service';
import { NotificationEmailTermPolicyService } from '@modules/notification/services/notification.email.term-policy.service';
import { NotificationEmailWorkspaceService } from '@modules/notification/services/notification.email.workspace.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationEmailProcessorService implements INotificationEmailProcessorService {
    constructor(
        private readonly notificationEmailAccountService: NotificationEmailAccountService,
        private readonly notificationEmailSecurityService: NotificationEmailSecurityService,
        private readonly notificationEmailTermPolicyService: NotificationEmailTermPolicyService,
        private readonly notificationEmailWorkspaceService: NotificationEmailWorkspaceService
    ) {}

    async processWelcome(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        return this.notificationEmailAccountService.processWelcome(
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
        return this.notificationEmailAccountService.processWelcomeSocial(
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
        return this.notificationEmailAccountService.processWelcomeByAdmin(
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
        return this.notificationEmailSecurityService.processTemporaryPasswordByAdmin(
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
        return this.notificationEmailSecurityService.processChangePassword(
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
        return this.notificationEmailSecurityService.processResetPassword(
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
        return this.notificationEmailAccountService.processVerificationEmail(
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
        return this.notificationEmailAccountService.processVerifiedEmail(
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
        return this.notificationEmailSecurityService.processForgotPassword(
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
        return this.notificationEmailAccountService.processVerifiedMobileNumber(
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
        return this.notificationEmailSecurityService.processResetTwoFactorByAdmin(
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
        return this.notificationEmailSecurityService.processNewDeviceLogin(
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
        return this.notificationEmailTermPolicyService.processPublishTermPolicy(
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
        return this.notificationEmailWorkspaceService.processWorkspaceInvite(
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
        return this.notificationEmailWorkspaceService.processWorkspaceInviteUnregistered(
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
        return this.notificationEmailWorkspaceService.processWorkspaceJoinRequest(
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
        return this.notificationEmailWorkspaceService.processWorkspaceJoinAccepted(
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
        return this.notificationEmailWorkspaceService.processWorkspaceJoinRejected(
            job.data.send,
            job.data.data!
        );
    }
}
