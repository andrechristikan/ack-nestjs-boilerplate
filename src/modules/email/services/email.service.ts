import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailForgotPasswordDto } from '@modules/email/dtos/email.forgot-password.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { EnumSendEmailProcess } from '@modules/email/enums/email.enum';
import { IEmailService } from '@modules/email/interfaces/email.service.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnumQueue, EnumQueuePriority } from 'src/queues/enums/queue.enum';

@Injectable()
export class EmailService implements IEmailService {
    constructor(
        @InjectQueue(EnumQueue.EMAIL) private readonly emailQueue: Queue
    ) {}

    async sendChangePassword(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.changePassword,
            {
                send: { email: email, name: username },
            },
            {
                priority: EnumQueuePriority.MEDIUM,
                deduplication: {
                    id: `${EnumSendEmailProcess.changePassword}-${userId}`,
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
            EnumSendEmailProcess.createByAdmin,
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
                jobId: `${EnumSendEmailProcess.createByAdmin}-${userId}`,
                priority: EnumQueuePriority.LOW,
            }
        );
    }

    async sendVerification(
        userId: string,
        { email, username }: EmailSendDto,
        { expiredAt, expiredInMinutes, link, reference }: EmailVerificationDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.verification,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                jobId: `${EnumSendEmailProcess.verification}-${userId}`,
                priority: EnumQueuePriority.HIGH,
            }
        );
    }

    async sendTemporaryPassword(
        userId: string,
        { email, username }: EmailSendDto,
        { password, passwordCreatedAt, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.temporaryPassword,
            {
                send: { email, username },
                data: { password, passwordCreatedAt, passwordExpiredAt },
            },
            {
                deduplication: {
                    id: `${EnumSendEmailProcess.temporaryPassword}-${userId}`,
                    ttl: 1000,
                },
                priority: EnumQueuePriority.HIGH,
            }
        );
    }

    async sendWelcome(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.welcome,
            {
                send: { email, username },
            },
            {
                jobId: `${EnumSendEmailProcess.welcome}-${userId}`,
                priority: EnumQueuePriority.LOW,
            }
        );
    }

    async sendVerified(
        userId: string,
        { email, username }: EmailSendDto,
        { reference }: EmailVerifiedDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.emailVerified,
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
                jobId: `${EnumSendEmailProcess.emailVerified}-${userId}`,
                priority: EnumQueuePriority.MEDIUM,
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
            EnumSendEmailProcess.forgotPassword,
            {
                send: {
                    email,
                    username,
                },
                data: { expiredAt, expiredInMinutes, link, reference },
            },
            {
                deduplication: {
                    id: `${EnumSendEmailProcess.forgotPassword}-${userId}`,
                    ttl: resendInMinutes * 60 * 1000,
                },
                priority: EnumQueuePriority.HIGH,
            }
        );
    }

    async sendResetTwoFactorByAdmin(
        userId: string,
        { email, username }: EmailSendDto
    ): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.resetTwoFactorByAdmin,
            {
                send: { email, username },
            },
            {
                jobId: `${EnumSendEmailProcess.resetTwoFactorByAdmin}-${userId}`,
                priority: EnumQueuePriority.MEDIUM,
            }
        );
    }
}
