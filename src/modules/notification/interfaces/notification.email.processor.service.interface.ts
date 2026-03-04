import {
    INotificationEmailWorkerBulkPayload,
    INotificationEmailWorkerPayload,
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
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

export interface INotificationEmailProcessorService {
    processChangePassword(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcome(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcomeSocial(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processWelcomeByAdmin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationWelcomeByAdminPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processTemporaryPasswordByAdmin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationTemporaryPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processForgotPassword(
        job: Job<
            INotificationEmailWorkerPayload<INotificationForgotPasswordPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerificationEmail(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerificationEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerifiedEmail(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerifiedEmailPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processVerifiedMobileNumber(
        job: Job<
            INotificationEmailWorkerPayload<INotificationVerifiedMobileNumberPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processNewDeviceLogin(
        job: Job<
            INotificationEmailWorkerPayload<INotificationNewDeviceLoginPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processResetPassword(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processResetTwoFactorByAdmin(
        job: Job<
            INotificationEmailWorkerPayload,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
    processPublishTermPolicy(
        job: Job<
            INotificationEmailWorkerBulkPayload<INotificationPublishTermPolicyPayload>,
            IQueueResponse,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse>;
}
