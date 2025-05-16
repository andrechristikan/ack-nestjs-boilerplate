import { ENUM_SEND_SMS_PROCESS } from '@app/modules/sms/enums/sms.enum';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { SmsVerificationRequestDto } from 'src/modules/sms/dtos/request/sms.verification.request.dto';
import { ISmsProcessor } from 'src/modules/sms/interfaces/sms.processor.interface';
import { SmsService } from 'src/modules/sms/services/sms.service';
import { ENUM_WORKER_QUEUES } from 'src/worker/enums/worker.enum';

@Processor({
    name: ENUM_WORKER_QUEUES.SMS_QUEUE,
})
export class SmsProcessor extends WorkerHost implements ISmsProcessor {
    constructor(private readonly smsService: SmsService) {
        super();
    }

    async process(job: Job<any>): Promise<any> {
        try {
            switch (job.name) {
                case ENUM_SEND_SMS_PROCESS.VERIFICATION:
                    await this.processOtpVerificationSms(
                        job.data.send,
                        job.data.data as SmsVerificationRequestDto
                    );
                    return;
                default:
                    return;
            }
        } catch (error: unknown) {
            throw error;
        }
    }

    async processOtpVerificationSms(
        send: SmsSendRequestDto,
        data: SmsVerificationRequestDto
    ): Promise<void> {
        await this.smsService.sendVerification(send, data);
    }
}
