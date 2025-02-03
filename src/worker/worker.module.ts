import { Module } from '@nestjs/common';
import { EmailModule } from 'src/modules/email/email.module';
import { EmailProcessor } from 'src/modules/email/processors/email.processor';
import { SessionProcessor } from 'src/modules/session/processors/session.processor';
import { SessionModule } from 'src/modules/session/session.module';
import { SmsProcessor } from 'src/modules/sms/processors/sms.processor';
import { SmsModule } from 'src/modules/sms/sms.module';

@Module({
    imports: [EmailModule, SessionModule, SmsModule],
    providers: [EmailProcessor, SessionProcessor, SmsProcessor],
})
export class WorkerModule {}
