import { EnumEmailProcess } from '@modules/email/enums/email.enum';
import { IEmailSendPayload } from '@modules/email/interfaces/email.interface';
import {
    INotificationCreateByAdminPayload,
    INotificationEmailVerificationPayload,
    INotificationEmailVerifiedPayload,
    INotificationForgotPasswordPayload,
    INotificationMobileNumberVerifiedPayload,
    INotificationNewDeviceLoginPayload,
    INotificationPublishTermPolicyPayload,
    INotificationTemporaryPasswordPayload,
} from '@modules/notification/interfaces/notification.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class EmailUtil {
    constructor(
        @InjectQueue(EnumQueue.email) private readonly emailQueue: Queue
    ) {}

    async sendResetPassword(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.resetPassword,
            {
                send: { email: email, name: username },
            },
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumEmailProcess.resetPassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendChangePassword(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.changePassword,
            {
                send: { email: email, name: username },
            },
            {
                priority: EnumQueuePriority.low,
                deduplication: {
                    id: `${EnumEmailProcess.changePassword}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendWelcomeByAdmin(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            passwordCreatedAt,
            passwordExpiredAt,
            password,
        }: INotificationCreateByAdminPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.createByAdmin,
            {
                send: {
                    email,
                    username,
                },
                data: {
                    passwordExpiredAt,
                    password,
                    passwordCreatedAt,
                },
            },
            {
                jobId: `${EnumEmailProcess.createByAdmin}-${userId}`,
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendVerification(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: INotificationEmailVerificationPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.verification,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                jobId: `${EnumEmailProcess.verification}-${userId}`,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendTemporaryPasswordByAdmin(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: INotificationTemporaryPasswordPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.temporaryPasswordByAdmin,
            {
                send: { email, username },
                data: { password, passwordCreatedAt, passwordExpiredAt },
            },
            {
                deduplication: {
                    id: `${EnumEmailProcess.temporaryPasswordByAdmin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.medium,
            }
        );
    }

    async sendWelcome(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.welcome,
            {
                send: { email, username },
            },
            {
                jobId: `${EnumEmailProcess.welcome}-${userId}`,
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendVerifiedEmail(
        userId: string,
        { email, username }: IEmailSendPayload,
        { reference }: INotificationEmailVerifiedPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.emailVerified,
            {
                send: {
                    email,
                    username,
                },
                data: {
                    reference,
                },
            },
            {
                jobId: `${EnumEmailProcess.emailVerified}-${userId}`,
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendForgotPassword(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
            resendInMinutes,
        }: INotificationForgotPasswordPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.forgotPassword,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                deduplication: {
                    id: `${EnumEmailProcess.forgotPassword}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendVerifiedMobileNumber(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            mobileNumber,
            reference,
            resendInMinutes,
        }: INotificationMobileNumberVerifiedPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.mobileNumberVerified,
            {
                send: {
                    email,
                    username,
                },
                data: { mobileNumber, reference },
            },
            {
                deduplication: {
                    id: `${EnumEmailProcess.mobileNumberVerified}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.low,
            }
        );
    }

    async sendResetTwoFactorByAdmin(
        userId: string,
        { email, username }: IEmailSendPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.resetTwoFactorByAdmin,
            {
                send: { email, username },
            },
            {
                jobId: `${EnumEmailProcess.resetTwoFactorByAdmin}-${userId}`,
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendNewDeviceLogin(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            loginFrom,
            loginWith,
            loginAt,
            requestLog,
        }: INotificationNewDeviceLoginPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.newDeviceLogin,
            {
                send: { email, username },
                data: {
                    loginFrom,
                    loginWith,
                    loginAt,
                    requestLog,
                },
            },
            {
                deduplication: {
                    id: `${EnumEmailProcess.newDeviceLogin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.high,
            }
        );
    }

    async sendPublishTermPolicy(
        payload: INotificationPublishTermPolicyPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.publishTermPolicy,
            {
                data: payload,
            },
            {
                priority: EnumQueuePriority.medium,
            }
        );
    }
}
