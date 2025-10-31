import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ENUM_QUEUE } from 'src/queues/enums/queue.enum';

/**
 * Global module for registering Bull queues with default configurations
 * Provides dynamic module registration for email queuing system
 */
@Global()
@Module({})
export class QueueRegisterModule {
    /**
     * Creates and configures email queue with default job options
     * @returns {DynamicModule} Dynamic module with email queue configuration
     */
    static forRoot(): DynamicModule {
        const emailQueue = BullModule.registerQueue({
            name: ENUM_QUEUE.EMAIL,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: 20,
                removeOnFail: 50,
            },
        });

        return {
            module: QueueRegisterModule,
            exports: [emailQueue],
            imports: [emailQueue],
        };
    }
}
