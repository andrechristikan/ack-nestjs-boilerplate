import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailMobileNumberVerifiedDto } from '@modules/email/dtos/email.mobile-number-verified.dto';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from '@modules/email/dtos/email.temp-password.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EmailVerifiedDto } from '@modules/email/dtos/email.verified.dto';
import { EmailWorkerDto } from '@modules/email/dtos/email.worker.dto';
import { EnumSendEmailProcess } from '@modules/email/enums/email.enum';
import { IEmailProcessor } from '@modules/email/interfaces/email.processor.interface';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import { EmailUtil } from '@modules/email/utils/email.util';
import { EmailForgotPasswordDto } from '@modules/email/dtos/email.forgot-password.dto';

@QueueProcessor(EnumQueue.EMAIL)
export class EmailProcessor
    extends QueueProcessorBase
    implements IEmailProcessor
{
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(private readonly emailUtil: EmailUtil) {
        super();
    }

    async process(
        job: Job<EmailWorkerDto<unknown>, unknown, string>
    ): Promise<void> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumSendEmailProcess.changePassword:
                    await this.processChangePassword(job.data.send);

                    break;
                case EnumSendEmailProcess.welcome:
                    await this.processWelcome(job.data.send);

                    break;
                case EnumSendEmailProcess.createByAdmin:
                    await this.processCreateByAdmin(
                        job.data.send,
                        job.data.data as EmailTempPasswordDto
                    );

                    break;
                case EnumSendEmailProcess.temporaryPassword:
                    await this.processTempPassword(
                        job.data.send,
                        job.data.data as EmailTempPasswordDto
                    );

                    break;
                case EnumSendEmailProcess.forgotPassword:
                    await this.processForgotPassword(
                        job.data.send,
                        job.data.data as EmailForgotPasswordDto
                    );

                    break;
                case EnumSendEmailProcess.verification:
                    await this.processVerification(
                        job.data.send,
                        job.data.data as EmailVerificationDto
                    );

                    break;
                case EnumSendEmailProcess.emailVerified:
                    await this.processEmailVerified(
                        job.data.send,
                        job.data.data as EmailVerifiedDto
                    );

                    break;
                case EnumSendEmailProcess.mobileNumberVerified:
                    await this.processMobileNumberVerified(
                        job.data.send,
                        job.data.data as EmailMobileNumberVerifiedDto
                    );

                    break;
                default:
                    break;
            }
        } catch (error: unknown) {
            this.logger.error(error);
        }

        return;
    }

    async processWelcome(data: EmailSendDto): Promise<boolean> {
        return this.emailUtil.sendWelcome(data);
    }

    async processChangePassword(data: EmailSendDto): Promise<boolean> {
        return this.emailUtil.sendChangePassword(data);
    }

    async processTempPassword(
        data: EmailSendDto,
        tempPassword: EmailTempPasswordDto
    ): Promise<boolean> {
        return this.emailUtil.sendTempPassword(data, tempPassword);
    }

    async processCreateByAdmin(
        data: EmailSendDto,
        createdByAdmin: EmailTempPasswordDto
    ): Promise<boolean> {
        return this.emailUtil.sendCreateByAdmin(data, createdByAdmin);
    }

    async processForgotPassword(
        data: EmailSendDto,
        forgotPassword: EmailForgotPasswordDto
    ): Promise<boolean> {
        return this.emailUtil.sendForgotPassword(data, forgotPassword);
    }

    async processVerification(
        data: EmailSendDto,
        verification: EmailVerificationDto
    ): Promise<boolean> {
        return this.emailUtil.sendVerification(data, verification);
    }

    async processEmailVerified(
        data: EmailSendDto,
        emailVerified: EmailVerifiedDto
    ): Promise<boolean> {
        return this.emailUtil.sendEmailVerified(data, emailVerified);
    }

    async processMobileNumberVerified(
        data: EmailSendDto,
        mobileNumberVerified: EmailMobileNumberVerifiedDto
    ): Promise<boolean> {
        return this.emailUtil.sendMobileNumberVerified(
            data,
            mobileNumberVerified
        );
    }
}
