import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationNewDeviceLoginPayload,
    INotificationPushCleanupTokenQueuePayload,
    INotificationPushQueuePayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationPushProcessorService {
    processNewDeviceLogin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationNewDeviceLoginPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin({
        data: {
            send: { notificationTokens, username, notificationId, userId },
            data,
        },
    }: Job<
        INotificationPushQueuePayload<INotificationTemporaryPasswordPayload>,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processResetPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processForgotPassword({
        data: {
            send: { notificationTokens, username, notificationId, userId },
        },
    }: Job<
        INotificationPushQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processCleanupTokens({
        data: {
            data: { failureTokens, userId },
        },
    }: Job<
        INotificationPushCleanupTokenQueuePayload,
        IQueueResponse,
        EnumNotificationPushProcess
    >): Promise<IQueueResponse>;
    processCleanupStaleTokens(): Promise<IQueueResponse>;
}
