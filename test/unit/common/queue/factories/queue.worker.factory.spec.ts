import { Test } from '@nestjs/testing';
import { BullModule } from '@nestjs/bullmq';
import type { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RedisQueueWorkerClient } from '@common/redis/constants/redis.constant';
import { QueueWorkerBase } from '@common/queue/bases/queue.worker.base';
import { QueueWorkerFactory } from '@common/queue/factories/queue.worker.factory';

describe('QueueWorkerFactory', () => {
    const connection: MockProxy<Redis> = mock<Redis>();
    const setWorkerClass = vi.fn();

    beforeEach(async () => {
        vi.spyOn(BullModule, 'workerClass', 'set').mockImplementation(
            setWorkerClass
        );

        await Test.createTestingModule({
            providers: [
                QueueWorkerFactory,
                { provide: RedisQueueWorkerClient, useValue: connection },
            ],
        }).compile();
    });

    afterEach(() => {
        QueueWorkerBase.connection = null;
    });

    describe('constructor', () => {
        it('sets the worker base connection to the injected client', () => {
            expect(QueueWorkerBase.connection).toBe(connection);
        });

        it('assigns BullModule.workerClass once with QueueWorkerBase', () => {
            expect(setWorkerClass).toHaveBeenCalledTimes(1);
            expect(setWorkerClass).toHaveBeenCalledWith(QueueWorkerBase);
        });
    });
});
