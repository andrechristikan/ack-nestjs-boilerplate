import {
    Controller,
    Get,
    InternalServerErrorException,
    Optional
} from '@nestjs/common';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { IKafkaResponse } from '../response/kafka.response.interface';

import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IErrorKafka } from '../error/kafka.error.interface';
import { KafkaProducerService } from './kafka.producer.service';
import { KafkaProducer } from './kafka.producer.decorator';

@Controller('kafka/produce')
export class KafkaProducerController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        @Optional()
        @KafkaProducer()
        private readonly kafkaProducerService: KafkaProducerService
    ) {}

    @Response('kafka.produce')
    @Get('/')
    async produce(): Promise<IResponse> {
        try {
            const kafka: IKafkaResponse = await this.kafkaProducerService.send(
                'nestjs.ack.success',
                {
                    from: '127.0.0.1'
                }
            );

            return kafka;
        } catch (err: any) {
            this.debuggerService.error('Produce Internal Server Error', {
                class: 'KafkaProducerController',
                function: 'produce',
                ...err
            });

            const errors: IErrorKafka = err as IErrorKafka;
            throw new InternalServerErrorException({
                statusCode: errors.statusCode,
                message: errors.message
            });
        }
    }

    @Response('kafka.error.produce')
    @Get('/error')
    async produceError(): Promise<IResponse> {
        try {
            const kafka: IKafkaResponse = await this.kafkaProducerService.send(
                'nestjs.ack.error',
                {
                    from: '127.0.0.1'
                }
            );

            return kafka;
        } catch (err: any) {
            this.debuggerService.error('Produce Internal Server Error', {
                class: 'KafkaProducerController',
                function: 'produce',
                ...err
            });

            const errors: IErrorKafka = err as IErrorKafka;
            throw new InternalServerErrorException({
                statusCode: errors.statusCode,
                message: errors.message
            });
        }
    }
}
