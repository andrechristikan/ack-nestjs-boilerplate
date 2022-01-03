import {
    Controller,
    Get,
    InternalServerErrorException,
    Optional
} from '@nestjs/common';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IErrorKafka } from '../error/kafka.error.interface';
import { KafkaProducerService } from './kafka.producer.service';
import { KafkaProducer } from './kafka.producer.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('kafka/produce')
export class KafkaProducerController {
    private readonly env: string;

    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        @Optional()
        @KafkaProducer()
        private readonly kafkaProducerService: KafkaProducerService,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    @Response('kafka.produce')
    @Get('/')
    async produce(): Promise<void> {
        if (this.env !== 'testing') {
            try {
                await this.kafkaProducerService.send('nestjs.ack.success', {
                    from: '127.0.0.1'
                });
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

        return;
    }

    @Response('kafka.error.produce')
    @Get('/error')
    async produceError(): Promise<IResponse> {
        if (this.env !== 'testing') {
            try {
                await this.kafkaProducerService.send('nestjs.ack.error', {
                    from: '127.0.0.1'
                });
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
        return;
    }
}
