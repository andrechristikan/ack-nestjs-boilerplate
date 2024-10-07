import { Module } from '@nestjs/common';
import { EmailModule } from 'src/modules/email/email.module';
import { EmailProcessor } from 'src/modules/email/processors/email.processor';
import { SessionProcessor } from 'src/modules/session/processors/session.processor';
import { SessionModule } from 'src/modules/session/session.module';

@Module({
    imports: [EmailModule, SessionModule],
    providers: [EmailProcessor, SessionProcessor],
})
export class WorkerModule {}
