import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationBulkQueuePayload,
    INotificationForgotPasswordEncryptedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationQueuePayload,
    INotificationTemporaryPasswordEncryptedPayload,
    INotificationVerificationEmailEncryptedPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminEncryptedPayload,
    INotificationWorkspaceInviteEncryptedPayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationAccountDomain } from '@modules/notification/domains/notification.account.domain';
import { NotificationSecurityDomain } from '@modules/notification/domains/notification.security.domain';
import { NotificationTermPolicyDomain } from '@modules/notification/domains/notification.term-policy.domain';
import { NotificationWorkspaceDomain } from '@modules/notification/domains/notification.workspace.domain';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationProcessorService {
    constructor(
        private readonly notificationAccountDomain: NotificationAccountDomain,
        private readonly notificationSecurityDomain: NotificationSecurityDomain,
        private readonly notificationTermPolicyDomain: NotificationTermPolicyDomain,
        private readonly notificationWorkspaceDomain: NotificationWorkspaceDomain
    ) {}

    async processWelcomeByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationWelcomeByAdminEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountDomain.processWelcomeByAdmin(
            userId,
            proceedBy,
            data!
        );
    }

    async processWelcome({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountDomain.processWelcome(userId, data!);
    }

    async processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountDomain.processWelcomeSocial(userId);
    }

    async processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerifiedEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountDomain.processVerifiedEmail(
            userId,
            data!
        );
    }

    async processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationAccountDomain.processVerificationEmail(
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
        return this.notificationAccountDomain.processVerifiedMobileNumber(
            userId,
            data!
        );
    }

    async processTemporaryPasswordByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationTemporaryPasswordEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityDomain.processTemporaryPasswordByAdmin(
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
        return this.notificationSecurityDomain.processChangePassword(userId);
    }

    async processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationForgotPasswordEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityDomain.processForgotPassword(
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
        return this.notificationSecurityDomain.processResetPassword(userId);
    }

    async processResetTwoFactorByAdmin({
        data: { userId, proceedBy },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationSecurityDomain.processResetTwoFactorByAdmin(
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
        return this.notificationSecurityDomain.processNewDeviceLogin(
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
        return this.notificationTermPolicyDomain.processPublishTermPolicy(
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
        return this.notificationTermPolicyDomain.processUserAcceptTermPolicy(
            userId,
            data!
        );
    }

    async processWorkspaceInvite({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceInviteEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceDomain.processWorkspaceInvite(
            userId,
            proceedBy,
            data!
        );
    }

    async processWorkspaceJoinRequest({
        data: { userId, proceedBy, data },
    }: Job<
        INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        return this.notificationWorkspaceDomain.processWorkspaceJoinRequest(
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
        return this.notificationWorkspaceDomain.processWorkspaceJoinAccepted(
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
        return this.notificationWorkspaceDomain.processWorkspaceJoinRejected(
            userId,
            proceedBy,
            data!
        );
    }
}
