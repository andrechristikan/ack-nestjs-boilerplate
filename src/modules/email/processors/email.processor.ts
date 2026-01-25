import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EnumEmailProcess } from '@modules/email/enums/email.enum';
import { EnumQueue } from 'src/queues/enums/queue.enum';
import { QueueProcessorBase } from 'src/queues/bases/queue.processor.base';
import { QueueProcessor } from 'src/queues/decorators/queue.decorator';
import {
    ICreateByAdminPayload,
    IEmailForgotPasswordPayload,
    IEmailMobileNumberVerifiedPayload,
    IEmailNewLoginPayload,
    IEmailTempPasswordPayload,
    IEmailVerificationPayload,
    IEmailVerifiedPayload,
    IEmailWorkerPayload,
} from '@modules/email/interfaces/email.interface';
import { EmailProcessorService } from '@modules/email/services/email.processor.service';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@QueueProcessor(EnumQueue.email)
export class EmailProcessor extends QueueProcessorBase {
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(private readonly emailProcessorService: EmailProcessorService) {
        super();
    }

    async process(
        job: Job<IEmailWorkerPayload<unknown>, unknown, string>
    ): Promise<IQueueResponse> {
        try {
            const jobName = job.name;
            switch (jobName) {
                case EnumEmailProcess.changePassword:
                    return this.emailProcessorService.processChangePassword(
                        job.data.send
                    );

                case EnumEmailProcess.welcome:
                    return this.emailProcessorService.processWelcome(
                        job.data.send
                    );

                case EnumEmailProcess.createByAdmin:
                    return this.emailProcessorService.processCreateByAdmin(
                        job.data.send,
                        job.data.data as ICreateByAdminPayload
                    );

                case EnumEmailProcess.temporaryPassword:
                    return this.emailProcessorService.processTempPassword(
                        job.data.send,
                        job.data.data as IEmailTempPasswordPayload
                    );

                case EnumEmailProcess.forgotPassword:
                    return this.emailProcessorService.processForgotPassword(
                        job.data.send,
                        job.data.data as IEmailForgotPasswordPayload
                    );

                case EnumEmailProcess.verification:
                    return this.emailProcessorService.processVerification(
                        job.data.send,
                        job.data.data as IEmailVerificationPayload
                    );

                case EnumEmailProcess.emailVerified:
                    return this.emailProcessorService.processEmailVerified(
                        job.data.send,
                        job.data.data as IEmailVerifiedPayload
                    );

                case EnumEmailProcess.mobileNumberVerified:
                    return this.emailProcessorService.processMobileNumberVerified(
                        job.data.send,
                        job.data.data as IEmailMobileNumberVerifiedPayload
                    );

                case EnumEmailProcess.newLogin:
                    return this.emailProcessorService.processNewLoginNotification(
                        job.data.send,
                        job.data.data as IEmailNewLoginPayload
                    );

                default:
                    return {
                        message: 'unhandledJob',
                    };
            }
        } catch (error: unknown) {
            this.logger.error(error);
        }

        return;
    }
}
