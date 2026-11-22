import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { CacheService } from '@common/cache/services/cache.service';

export abstract class QueueBase {
    private readonly logger = new Logger(QueueBase.name);

    constructor(
        protected readonly queue: Queue,
        protected readonly cacheService: CacheService
    ) {
        this.registerErrorListener();
    }

    private registerErrorListener(): void {
        this.queue.on('error', (error: Error) => this.onError(error));
    }

    private onError(error: Error): void {
        const isConnection = this.cacheService.isConnectionError(error);
        if (isConnection) {
            return;
        }

        this.logger.warn(error, 'Queue error');
    }
}
