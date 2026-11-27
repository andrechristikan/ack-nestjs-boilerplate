import { EnumPasswordHistoryQueue } from '@modules/password-history/enums/password-history.enum';
import { PasswordHistoryQueueFactory } from '@modules/password-history/factories/password-history.queue.factory';
import { PasswordHistoryQueue } from '@modules/password-history/queues/password-history.queue';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        PasswordHistoryRepository,
        PasswordHistoryService,
        PasswordHistoryQueue,
        {
            provide: EnumPasswordHistoryQueue.passwordHistory,
            useExisting: PasswordHistoryQueue,
        },
    ],
    exports: [PasswordHistoryService, PasswordHistoryQueue],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumPasswordHistoryQueue.passwordHistory,
            useClass: PasswordHistoryQueueFactory,
        }),
    ],
})
export class PasswordHistoryModule {}
