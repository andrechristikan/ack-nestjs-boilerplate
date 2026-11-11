import { RedisQueueWorkerClient } from '@common/redis/constants/redis.constant';
import { BullModule } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { QueueWorkerBase } from '@queues/bases/queue.worker.base';

@Injectable()
export class QueueWorkerFactory {
    constructor(
        @Inject(RedisQueueWorkerClient) private readonly connection: Redis
    ) {
        QueueWorkerBase.connection = this.connection;
        BullModule.workerClass = QueueWorkerBase;
    }
}
