import { Module } from '@nestjs/common';
// import { EmailModule } from '@modules/email/email.module';
// import { EmailProcessor } from '@modules/email/processors/email.processor';
// import { SessionModule } from '@modules/session/session.module';
// import { SmsProcessor } from '@modules/sms/processors/sms.processor';
// import { SmsModule } from '@modules/sms/sms.module';

@Module({
    // imports: [EmailModule, SessionModule, SmsModule],
    // providers: [EmailProcessor, SmsProcessor],
})
export class WorkerModule {}
