import { EnumOutboxQueue } from '@modules/outbox/enums/outbox.enum';
import { OutboxQueueFactory } from '@modules/outbox/factories/outbox.queue.factory';
import { OutboxQueue } from '@modules/outbox/queues/outbox.queue';
import { OutboxRepository } from '@modules/outbox/repositories/outbox.repository';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

/** Shared module: OutboxService for every service and use case adding an outbox row, and for every processor forwarding it to QueueProcessorBase. */
@Global()
@Module({
    controllers: [],
    providers: [OutboxRepository, OutboxService, OutboxQueue],
    exports: [OutboxService],
    imports: [
        BullModule.registerQueueAsync({
            name: EnumOutboxQueue.outbox,
            useClass: OutboxQueueFactory,
        }),
    ],
})
export class OutboxModule {}
