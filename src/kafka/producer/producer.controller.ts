import {
    Controller,
    Get,
    Inject,
    OnModuleDestroy,
    OnModuleInit
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { IKafkaResponse } from '../response/kafka.response.interface';
import {
    KAFKA_PRODUCER_SERVICE_NAME,
    KAFKA_PRODUCER_TOPICS
} from './producer.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IKafkaRequest } from '../request/kafka.request.interface';
import { IKafkaError } from '../error/kafka.error.interface';
import { ErrorHttpException } from 'src/error/filter/error.http.filter';

@Controller('kafka/produce')
export class KafkaProducerController implements OnModuleInit, OnModuleDestroy {
    constructor(
        @Inject(KAFKA_PRODUCER_SERVICE_NAME)
        private readonly client: ClientKafka,
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async onModuleInit(): Promise<void> {
        await this.client.connect();

        KAFKA_PRODUCER_TOPICS.forEach((val) =>
            this.client.subscribeToResponseOf(val)
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.close();
    }

    @Get('/')
    @Response('kafka.produce')
    async produce(): Promise<IResponse> {
        const message: IKafkaRequest = {
            value: {
                from: '127.0.0.1'
            },
            key: `${new Date().valueOf()}`
        };

        try {
            const kafka: IKafkaResponse = await this.client
                .send('nestjs.ack.success', message)
                .toPromise();

            return kafka;
        } catch (err: any) {
            this.debuggerService.error('Produce Internal Server Error', {
                class: 'KafkaProducerController',
                function: 'produce',
                ...err
            });

            const errors: IKafkaError = err as IKafkaError;
            throw new ErrorHttpException(errors.statusCode);
        }
    }

    @Get('/error')
    @Response('kafka.error.produce')
    async produceError(): Promise<IResponse> {
        const message: IKafkaRequest = {
            value: {
                from: '127.0.0.1'
            },
            key: `${new Date().valueOf()}`
        };

        try {
            const kafka: IKafkaResponse = await this.client
                .send('nestjs.ack.error', message)
                .toPromise();

            return kafka;
        } catch (err: any) {
            this.debuggerService.error('Produce Internal Server Error', {
                class: 'KafkaProducerController',
                function: 'produce',
                ...err
            });

            const errors: IKafkaError = err as IKafkaError;
            throw new ErrorHttpException(errors.statusCode);
        }
    }
}
