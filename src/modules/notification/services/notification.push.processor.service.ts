import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationPushQueuePayload,
    INotificationTemporaryPasswordPayload,
    INotificationWorkspaceInvitePayload,
    INotificationWorkspaceJoinAcceptedPayload,
    INotificationWorkspaceJoinRejectedPayload,
    INotificationWorkspaceJoinRequestPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushMaintenanceDomain } from '@modules/notification/domains/notification.push.maintenance.domain';
import { NotificationPushSecurityDomain } from '@modules/notification/domains/notification.push.security.domain';
import { NotificationPushWorkspaceDomain } from '@modules/notification/domains/notification.push.workspace.domain';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationPushProcessorService implements OnModuleInit {
    constructor(
        private readonly notificationPushSecurityDomain: NotificationPushSecurityDomain,
        private readonly notificationPushWorkspaceDomain: NotificationPushWorkspaceDomain,
        private readonly notificationPushMaintenanceDomain: NotificationPushMaintenanceDomain,
        private readonly notificationPushQueue: NotificationPushQueue
    ) {}

    async onModuleInit(): Promise<void> {
        await this.notificationPushQueue.sendCleanupStaleTokens();
    }

    async processNewDeviceLogin({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityDomain.processNewDeviceLogin(
            send,
            data!
        );
    }

    async processResetTwoFactorByAdmin({
        data: { send },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityDomain.processResetTwoFactorByAdmin(
            send
        );
    }

    async processTemporaryPasswordByAdmin({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationTemporaryPasswordPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityDomain.processTemporaryPasswordByAdmin(
            send,
            data!
        );
    }

    async processResetPassword({
        data: { send },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityDomain.processResetPassword(send);
    }

    async processForgotPassword({
        data: { send },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityDomain.processForgotPassword(send);
    }

    async processWorkspaceInvite({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceInvitePayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushWorkspaceDomain.processWorkspaceInvite(
            send,
            data!
        );
    }

    async processWorkspaceJoinRequest({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinRequestPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushWorkspaceDomain.processWorkspaceJoinRequest(
            send,
            data!
        );
    }

    async processWorkspaceJoinAccepted({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushWorkspaceDomain.processWorkspaceJoinAccepted(
            send,
            data!
        );
    }

    async processWorkspaceJoinRejected({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceJoinRejectedPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushWorkspaceDomain.processWorkspaceJoinRejected(
            send,
            data!
        );
    }

    async processCleanupTokens({
        data: {
            data: { userId, failureTokens },
        },
    }: Job<
        INotificationPushCleanupTokenQueuePayload,
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
