import { EnumOutboxQueue } from '@common/outbox/enums/outbox.enum';
import { OutboxQueueFactory } from '@common/outbox/factories/outbox.queue.factory';
import { OutboxQueue } from '@common/outbox/queues/outbox.queue';
import { OutboxRepository } from '@common/outbox/repositories/outbox.repository';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: OutboxService for every service and use case adding an outbox row or patching its data, and for QueueProcessorBase loading and stamping each job's row. */
@Global()
@Module({})
export class OutboxModule {
    static forRoot(): DynamicModule {
        return {
            module: OutboxModule,
            controllers: [],
            providers: [OutboxRepository, OutboxService, OutboxQueue],
            exports: [OutboxService],
            imports: [
                BullModule.registerQueueAsync({
                    name: EnumOutboxQueue.outbox,
                    useClass: OutboxQueueFactory,
                }),
            ],
        };
    }
}
