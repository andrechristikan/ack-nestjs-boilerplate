import { Controller } from '@nestjs/common';
import {
    Payload,
    KafkaContext,
    Ctx,
    RpcException,
} from '@nestjs/microservices';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IKafkaResponse } from '../response/kafka.response.interface';
import { IKafkaRequest } from '../request/kafka.request.interface';
import { KafkaRequest } from '../request/kafka.request.decorator';
import { ENUM_KAFKA_ERROR_STATUS_CODE } from '../error/kafka.error.constant';

@Controller()
export class KafkaConsumerController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    @KafkaRequest('nestjs.ack.success')
    async testKafka(
        @Payload() message: IKafkaRequest<Record<string, any>>,
        @Ctx() context: KafkaContext
    ): Promise<IKafkaResponse> {
        const originalMessage = context.getMessage();
        const topic = context.getTopic();
        const partition = context.getPartition();

        this.debuggerService.info('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage,
        });

        this.debuggerService.info('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage,
        });

        this.debuggerService.info('Topic', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            topic,
        });

        this.debuggerService.info('Partition', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            partition,
        });

        this.debuggerService.info('Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            message,
        });

        return {
            key: message.key,
            value: message.value,
            headers: message.headers,
        };
    }

    @KafkaRequest('nestjs.ack.error')
    async testKafkaError(
        @Payload() message: IKafkaRequest<Record<string, any>>,
        @Ctx() context: KafkaContext
    ): Promise<IKafkaResponse> {
        const originalMessage = context.getMessage();
        const topic = context.getTopic();
        const partition = context.getPartition();

        this.debuggerService.error('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage,
        });

        this.debuggerService.error('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage,
        });

        this.debuggerService.error('Topic', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            topic,
        });

        this.debuggerService.error('Partition', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            partition,
        });

        this.debuggerService.error('Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            message,
        });

        throw new RpcException({
            statusCode: ENUM_KAFKA_ERROR_STATUS_CODE.TEST_KAFKA_ERROR,
            message: 'kafka.error.produce',
        });
    }
}
