import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailForgotPasswordDto } from '@modules/email/dtos/email.forgot-password.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { IEmailService } from '@modules/email/interfaces/email.service.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENUM_QUEUE, ENUM_QUEUE_PRIORITY } from 'src/queues/enums/queue.enum';

@Injectable()
export class EmailService implements IEmailService {
    constructor(
        @InjectQueue(ENUM_QUEUE.EMAIL) private readonly emailQueue: Queue
    ) {}

    async sendChangePassword(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
            {
                send: { email: email, name: username },
            },
            {
                priority: ENUM_QUEUE_PRIORITY.MEDIUM,
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${userId}`,
                    ttl: 1000,
                },
            }
        );
    }

    async sendWelcomeByAdmin(
        userId: string,
        { email, username }: EmailSendDto,
        {
            passwordCreatedAt,
            passwordExpiredAt,
            password,
        }: EmailCreateByAdminDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN,
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
                jobId: `${ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN}-${userId}`,
                priority: ENUM_QUEUE_PRIORITY.LOW,
            }
        );
    }

    async sendVerification(
        userId: string,
        { email, username }: EmailSendDto,
        { expiredAt, expiredInMinutes, link, reference }: EmailVerificationDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                jobId: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${userId}`,
                priority: ENUM_QUEUE_PRIORITY.HIGH,
            }
        );
    }

    async sendTemporaryPassword(
        userId: string,
        { email, username }: EmailSendDto,
        { password, passwordCreatedAt, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
            {
                send: { email, username },
                data: { password, passwordCreatedAt, passwordExpiredAt },
            },
            {
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD}-${userId}`,
                    ttl: 1000,
                },
                priority: ENUM_QUEUE_PRIORITY.HIGH,
            }
        );
    }

    async sendWelcome(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.WELCOME,
            {
                send: { email, username },
            },
            {
                jobId: `${ENUM_SEND_EMAIL_PROCESS.WELCOME}-${userId}`,
                priority: ENUM_QUEUE_PRIORITY.LOW,
            }
        );
    }

    async sendVerified(
        userId: string,
        { email, username }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED,
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
                jobId: `${ENUM_SEND_EMAIL_PROCESS.EMAIL_VERIFIED}-${userId}`,
                priority: ENUM_QUEUE_PRIORITY.MEDIUM,
            }
        );
    }

    async sendForgotPassword(
        userId: string,
        { email, username }: EmailSendDto,
        {
            expiredAt,
            expiredInMinutes,
            link,
            reference,
        }: EmailForgotPasswordDto,
        resendInMinutes: number
    ): Promise<void> {
        await this.emailQueue.add(
            ENUM_SEND_EMAIL_PROCESS.FORGOT_PASSWORD,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.FORGOT_PASSWORD}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: ENUM_QUEUE_PRIORITY.HIGH,
            }
        );
    }
}
