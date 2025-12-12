import { EmailModule } from '@modules/email/email.module';
import { EmailProcessor } from '@modules/email/processors/email.processor';
import { Module } from '@nestjs/common';

/**
 * Module for managing queue processors
 * Imports EmailModule and provides EmailProcessor for handling email queues
 */
@Module({
    imports: [EmailModule],
    providers: [EmailProcessor],
})
export class QueueModule {}
