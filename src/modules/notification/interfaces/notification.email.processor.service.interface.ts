import {
    INotificationEmailBulkQueuePayload,
    INotificationEmailQueuePayload,
    INotificationForgotPasswordPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
    INotificationVerificationEmailPayload,
    INotificationVerifiedEmailPayload,
    INotificationVerifiedMobileNumberPayload,
    INotificationWelcomeByAdminPayload,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { Job } from 'bullmq';
import { IQueueResponse } from '@queues/interfaces/queue.interface';

export interface INotificationEmailProcessorService {
    processChangePassword(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcome(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcomeSocial(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcomeByAdmin(
        job: Job<
            INotificationEmailQueuePayload<INotificationWelcomeByAdminPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin(
        job: Job<
            INotificationEmailQueuePayload<INotificationTemporaryPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processForgotPassword(
        job: Job<
            INotificationEmailQueuePayload<INotificationForgotPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerificationEmail(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerificationEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerifiedEmail(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerifiedMobileNumber(
        job: Job<
            INotificationEmailQueuePayload<INotificationVerifiedMobileNumberPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        job: Job<
            INotificationEmailQueuePayload<INotificationNewDeviceLoginPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processResetPassword(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin(
        job: Job<
            INotificationEmailQueuePayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processPublishTermPolicy(
        job: Job<
            INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
}
