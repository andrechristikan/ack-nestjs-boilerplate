import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';
import { EmailTempPasswordDto } from 'src/modules/email/dtos/email.temp-password.dto';
import { EmailWelcomeAdminDto } from 'src/modules/email/dtos/email.welcome-admin.dto';
import { ENUM_EMAIL } from 'src/modules/email/enums/email.enum';
import { IEmailProcessor } from 'src/modules/email/interfaces/email.processor.interface';
import { EmailService } from 'src/modules/email/services/email.service';
import { WorkerEmailDto } from 'src/worker/dtos/worker.email.dto';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Processor(ENUM_WORKER_QUEUES.EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost implements IEmailProcessor {
    private readonly debug: boolean;
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly configService: ConfigService
    ) {
        super();

        this.debug = this.configService.get<boolean>('app.debug');
    }

    async process(job: Job<WorkerEmailDto, any, string>): Promise<void> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case ENUM_EMAIL.TEMP_PASSWORD:
                    await this.processTempPassword(
                        job.data.send,
                        job.data.data as EmailTempPasswordDto
                    );

                    break;
                case ENUM_EMAIL.CHANGE_PASSWORD:
                    await this.processChangePassword(job.data.send);

                    break;
                case ENUM_EMAIL.WELCOME_ADMIN:
                    await this.processWelcomeAdmin(
                        job.data.send,
                        job.data.data as EmailWelcomeAdminDto
                    );

                    break;
                case ENUM_EMAIL.WELCOME:
                default:
                    await this.processWelcome(job.data.send);

                    break;
            }
        } catch (error: any) {
            if (this.debug) {
                this.logger.error(error);
            }
        }

        return;
    }

    async processWelcome(data: EmailSendDto): Promise<boolean> {
        return this.emailService.sendWelcome(data);
    }

    async processWelcomeAdmin(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailWelcomeAdminDto
    ): Promise<boolean> {
        return this.emailService.sendWelcomeAdmin(
            {
                email,
                name,
            },
            { password, passwordExpiredAt }
        );
    }

    async processChangePassword(data: EmailSendDto): Promise<boolean> {
        return this.emailService.sendChangePassword(data);
    }

    async processTempPassword(
        { name, email }: EmailSendDto,
        { password, passwordExpiredAt }: EmailTempPasswordDto
    ): Promise<boolean> {
        return this.emailService.sendTempPassword(
            { email, name },
            { password, passwordExpiredAt }
        );
    }
}
