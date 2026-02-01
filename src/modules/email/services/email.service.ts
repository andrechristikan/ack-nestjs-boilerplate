import { EnumEmailProcess } from '@modules/email/enums/email.enum';
import {
    ICreateByAdminPayload,
    IEmailForgotPasswordPayload,
    IEmailMobileNumberVerifiedPayload,
    IEmailNewLoginPayload,
    IEmailSendPayload,
    IEmailTempPasswordPayload,
    IEmailVerificationPayload,
    IEmailVerifiedPayload,
} from '@modules/email/interfaces/email.interface';
import { IEmailService } from '@modules/email/interfaces/email.service.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class EmailService implements IEmailService {
    constructor(
        @InjectQueue(EnumQueue.email) private readonly emailQueue: Queue
    ) {}

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
        }: ICreateByAdminPayload
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
        }: IEmailVerificationPayload
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

    async sendTemporaryPassword(
        userId: string,
        { email, username }: IEmailSendPayload,
        {
            password,
            passwordCreatedAt,
            passwordExpiredAt,
        }: IEmailTempPasswordPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.temporaryPassword,
            {
                send: { email, username },
                data: { password, passwordCreatedAt, passwordExpiredAt },
            },
            {
                deduplication: {
                    id: `${EnumEmailProcess.temporaryPassword}-${userId}`,
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

    async sendVerified(
        userId: string,
        { email, username }: IEmailSendPayload,
        { reference }: IEmailVerifiedPayload
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
        }: IEmailForgotPasswordPayload,
        resendInMinutes: number
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
        { mobileNumber, reference }: IEmailMobileNumberVerifiedPayload,
        resendInMinutes: number
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

    async sendNewLogin(
        userId: string,
        { email, username }: IEmailSendPayload,
        { loginFrom, loginWith, loginAt, requestLog }: IEmailNewLoginPayload
    ): Promise<void> {
        await this.emailQueue.add(
            EnumEmailProcess.newLogin,
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
                    id: `${EnumEmailProcess.newLogin}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.medium,
            }
        );
    }
}
