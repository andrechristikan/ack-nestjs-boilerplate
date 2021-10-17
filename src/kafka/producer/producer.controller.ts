import { Controller, Get, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import {
    IKafkaRequest,
    IKafkaResponse
} from '../response/kafka.response.interface';
import {
    KAFKA_PRODUCER_SERVICE_NAME,
    KAFKA_PRODUCER_TOPICS
} from './producer.constant';

@Controller('kafka/produce')
export class KafkaProducerController {
    constructor(
        @Inject(KAFKA_PRODUCER_SERVICE_NAME)
        private readonly client: ClientKafka
    ) {}

    async onModuleInit(): Promise<void> {
        KAFKA_PRODUCER_TOPICS.forEach((val) =>
            this.client.subscribeToResponseOf(val)
        );

        await this.client.connect();
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
        const kafka: IKafkaResponse = await this.client
            .send('nestjs.ack.topic', message)
            .toPromise();

        return kafka;
    }
}
