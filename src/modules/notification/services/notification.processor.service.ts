import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { INotificationProcessorService } from '@modules/notification/interfaces/notification.processor.service.interface';
import { NotificationAccountService } from '@modules/notification/services/notification.account.service';
import { NotificationSecurityService } from '@modules/notification/services/notification.security.service';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { NotificationWorkspaceService } from '@modules/notification/services/notification.workspace.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationProcessorService implements INotificationProcessorService {
    constructor(
        private readonly notificationAccountService: NotificationAccountService,
        private readonly notificationSecurityService: NotificationSecurityService,
        private readonly notificationTermPolicyService: NotificationTermPolicyService,
        private readonly notificationWorkspaceService: NotificationWorkspaceService
    ) {}

    async processWelcomeByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationWelcomeByAdminPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processWelcomeByAdmin(
            userId,
            proceedBy,
            data!
        );
    }

    async processWelcome({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processWelcome(userId, data!);
    }

    async processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processWelcomeSocial(userId);
    }

    async processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerifiedEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processVerifiedEmail(
            userId,
            data!
        );
    }

    async processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processVerificationEmail(
            userId,
            data!
        );
    }

    async processVerifiedMobileNumber({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerifiedMobileNumberPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountService.processVerifiedMobileNumber(
            userId,
            data!
        );
    }

    async processTemporaryPasswordByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationTemporaryPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processTemporaryPasswordByAdmin(
            userId,
            proceedBy,
            data!
        );
    }

    async processChangePassword({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processChangePassword(userId);
    }

    async processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationForgotPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processForgotPassword(
            userId,
            data!
        );
    }

    async processResetPassword({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processResetPassword(userId);
    }

    async processResetTwoFactorByAdmin({
        data: { userId, proceedBy },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processResetTwoFactorByAdmin(
            userId,
            proceedBy
        );
    }

    async processNewDeviceLogin({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationNewDeviceLoginPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityService.processNewDeviceLogin(
            userId,
            data!
        );
    }

    async processPublishTermPolicy({
        data: { data, proceedBy },
    }: Job<
        INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationTermPolicyService.processPublishTermPolicy(
            proceedBy,
            data!
        );
    }

    async processUserAcceptTermPolicy({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationTermPolicyService.processUserAcceptTermPolicy(
            userId,
            data!
        );
    }

    async processWorkspaceInvite({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceInvitePayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceService.processWorkspaceInvite(
            userId,
            proceedBy,
            data!
        );
    }

    async processWorkspaceJoinRequest({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceJoinRequestPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceService.processWorkspaceJoinRequest(
            userId,
            proceedBy,
            data!
        );
    }

    async processWorkspaceJoinAccepted({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceService.processWorkspaceJoinAccepted(
            userId,
            proceedBy,
            data!
        );
    }

    async processWorkspaceJoinRejected({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceService.processWorkspaceJoinRejected(
            userId,
            proceedBy,
            data!
        );
    }
}
