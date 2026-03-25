import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushWorkerCleanupTokenPayload,
    INotificationPushWorkerPayload,
    INotificationTemporaryPasswordPayload,
    INotificationTenantInviteEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { Job } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface INotificationPushProcessorService {
    processNewDeviceLogin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushWorkerPayload<INotificationNewDeviceLoginPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushWorkerPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushWorkerPayload<INotificationTemporaryPasswordPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processResetPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushWorkerPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processForgotPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushWorkerPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processTenantInvite({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushWorkerPayload<INotificationTenantInviteEmailPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processCleanupTokens({
        data: {
            data: { failureTokens, userId },
        },
    }: Job<
        INotificationPushWorkerCleanupTokenPayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processCleanupStaleTokens(): Promise<IQueueResponse>;
}
