import { Controller } from '@nestjs/common';
import {
    MessagePattern,
    Payload,
    KafkaContext,
    Ctx,
    Transport
} from '@nestjs/microservices';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';

@Controller()
export class KafkaConsumerController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    @MessagePattern('nestjs.ack.topic', Transport.KAFKA)
    async testKafka(
        @Payload() message: Record<string, any>,
        @Ctx() context: KafkaContext
    ): Promise<any> {
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
