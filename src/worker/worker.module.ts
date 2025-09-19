import { EmailModule } from '@modules/email/email.module';
import { EmailProcessor } from '@modules/email/processors/email.processor';
import { Module } from '@nestjs/common';

@Module({
    imports: [EmailModule],
    providers: [EmailProcessor],
})
export class WorkerModule {}
