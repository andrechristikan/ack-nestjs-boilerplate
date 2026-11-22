import type {
    RegisterQueueOptions,
    RegisterQueueOptionsFactory,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthQueueFactory implements RegisterQueueOptionsFactory {
    createRegisterQueueOptions(): RegisterQueueOptions {
        return {};
    }
}
