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
import { INotificationPushProcessorService } from '@modules/notification/interfaces/notification.push.processor.service.interface';
import { NotificationPushMaintenanceService } from '@modules/notification/services/notification.push.maintenance.service';
import { NotificationPushSecurityService } from '@modules/notification/services/notification.push.security.service';
import { NotificationPushWorkspaceService } from '@modules/notification/services/notification.push.workspace.service';
import { NotificationPushQueue } from '@modules/notification/queues/notification.push.queue';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationPushProcessorService
    implements INotificationPushProcessorService, OnModuleInit
{
    constructor(
        private readonly notificationPushSecurityService: NotificationPushSecurityService,
        private readonly notificationPushWorkspaceService: NotificationPushWorkspaceService,
        private readonly notificationPushMaintenanceService: NotificationPushMaintenanceService,
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
        return this.notificationPushSecurityService.processNewDeviceLogin(
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
        return this.notificationPushSecurityService.processResetTwoFactorByAdmin(
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
        return this.notificationPushSecurityService.processTemporaryPasswordByAdmin(
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
        return this.notificationPushSecurityService.processResetPassword(send);
    }

    async processForgotPassword({
        data: { send },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushSecurityService.processForgotPassword(send);
    }

    async processWorkspaceInvite({
        data: { send, data },
    }: Job<
        INotificationPushQueuePayload<INotificationWorkspaceInvitePayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse> {
        return this.notificationPushWorkspaceService.processWorkspaceInvite(
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
        return this.notificationPushWorkspaceService.processWorkspaceJoinRequest(
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
        return this.notificationPushWorkspaceService.processWorkspaceJoinAccepted(
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
        return this.notificationPushWorkspaceService.processWorkspaceJoinRejected(
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
        return this.notificationPushMaintenanceService.processCleanupTokens(
            userId,
            failureTokens
        );
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        return this.notificationPushMaintenanceService.processCleanupStaleTokens();
    }
}
