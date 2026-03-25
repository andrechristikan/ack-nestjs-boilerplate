import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import {
    INotificationAcceptTermPolicyPayload,
    INotificationForgotPasswordPayload,
    INotificationInvitePayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationTenantInviteEmailPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
    INotificationWorkerBulkPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { Job } from 'bullmq';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface INotificationProcessorService {
    processWelcomeByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationWelcomeByAdminPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin({
        data: { proceedBy, userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationTemporaryPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processWelcome({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processWelcomeSocial({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processChangePassword({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerifiedEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerificationEmail({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerificationEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processVerifiedMobileNumber({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationVerifiedMobileNumberPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processForgotPassword({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationForgotPasswordPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processInvite({
        data: { userId, data, proceedBy },
    }: Job<
        INotificationWorkerPayload<INotificationInvitePayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processTenantInvite({
        data: { userId, data, proceedBy },
    }: Job<
        INotificationWorkerPayload<INotificationTenantInviteEmailPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processResetPassword({
        data: { userId },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin({
        data: { userId, proceedBy },
    }: Job<
        INotificationWorkerPayload,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processNewDeviceLogin({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationNewDeviceLoginPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processPublishTermPolicy({
        data: { data, proceedBy },
    }: Job<
        INotificationWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
    processUserAcceptTermPolicy({
        data: { userId, data },
    }: Job<
        INotificationWorkerPayload<INotificationAcceptTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse>;
}
