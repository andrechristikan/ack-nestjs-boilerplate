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
} from '@modules/notification/interfaces/notification.interface';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationProcessorService {
    processWelcomeByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationWelcomeByAdminPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationQueuePayload<INotificationTemporaryPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processWelcome({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processChangePassword({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerifiedEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerifiedMobileNumber({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationVerifiedMobileNumberPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationForgotPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processResetPassword({
        data: { userId },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin({
        data: { userId, proceedBy },
    }: Job<
        INotificationQueuePayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processNewDeviceLogin({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationNewDeviceLoginPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processPublishTermPolicy({
        data: { data, proceedBy },
    }: Job<
        INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processUserAcceptTermPolicy({
        data: { userId, data },
    }: Job<
        INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
}
