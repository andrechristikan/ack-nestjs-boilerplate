import { Module } from '@nestjs/common';
import { EmailModule } from '@module/email/email.module';
import { EmailProcessor } from '@module/email/processors/email.processor';
import { SessionModule } from '@module/session/session.module';
import { SmsProcessor } from '@module/sms/processors/sms.processor';
import { SmsModule } from '@module/sms/sms.module';

@Module({
    imports: [EmailModule, SessionModule, SmsModule],
    providers: [EmailProcessor, SmsProcessor],
})
export class WorkerModule {}
