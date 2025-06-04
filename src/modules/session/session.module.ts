import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SessionRepositoryModule } from '@module/session/repository/session.repository.module';
import { SessionService } from '@module/session/services/session.service';
import { ENUM_WORKER_QUEUES } from '@worker/enums/worker.enum';

@Module({
    imports: [
        SessionRepositoryModule,
        BullModule.registerQueueAsync({
            name: ENUM_WORKER_QUEUES.SESSION_QUEUE,
        }),
    ],
    exports: [SessionService],
    providers: [SessionService],
    controllers: [],
})
export class SessionModule {}
