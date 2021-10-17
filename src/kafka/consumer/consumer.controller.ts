import { Controller } from '@nestjs/common';
import { Payload, KafkaContext, Ctx } from '@nestjs/microservices';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import {
    IKafkaRequest,
    IKafkaResponse
} from '../response/kafka.response.interface';
import { KafkaResponse } from '../response/kafka.response.decorator';

@Controller()
export class KafkaConsumerController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    @KafkaResponse('nestjs.ack.topic')
    async testKafka(
        @Payload() message: IKafkaRequest,
        @Ctx() context: KafkaContext
    ): Promise<IKafkaResponse> {
        const originalMessage = context.getMessage();
        const topic = context.getTopic();
        const partition = context.getPartition();

        this.debuggerService.info('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage
        });

        this.debuggerService.info('Original Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            ...originalMessage
        });

        this.debuggerService.info('Topic', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            topic
        });

        this.debuggerService.info('Partition', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            partition
        });

        this.debuggerService.info('Message', {
            class: 'KafkaConsumerController',
            function: 'testKafka',
            message
        });

        return {
            key: message.key,
            message: message.value,
            from: 'kafka-ack-consumer'
        };
    }
}
