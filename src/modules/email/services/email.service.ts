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
            ENUM_SEND_EMAIL_PROCESS.changePassword,
            {
                send: { email: email, name: username },
            },
            {
                priority: ENUM_QUEUE_PRIORITY.MEDIUM,
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.changePassword}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.createByAdmin,
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
                jobId: `${ENUM_SEND_EMAIL_PROCESS.createByAdmin}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.verification,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                jobId: `${ENUM_SEND_EMAIL_PROCESS.verification}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.temporaryPassword,
            {
                send: { email, username },
                data: { password, passwordCreatedAt, passwordExpiredAt },
            },
            {
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.temporaryPassword}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.welcome,
            {
                send: { email, username },
            },
            {
                jobId: `${ENUM_SEND_EMAIL_PROCESS.welcome}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.emailVerified,
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
                jobId: `${ENUM_SEND_EMAIL_PROCESS.emailVerified}-${userId}`,
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
            ENUM_SEND_EMAIL_PROCESS.forgotPassword,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                deduplication: {
                    id: `${ENUM_SEND_EMAIL_PROCESS.forgotPassword}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: ENUM_QUEUE_PRIORITY.HIGH,
            }
        );
    }
}
