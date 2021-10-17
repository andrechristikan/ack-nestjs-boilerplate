import { Controller, Get, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { HttpResponse } from 'src/response/http/http-response.decorator';
import { IHttpResponse } from 'src/response/http/http-response.interface';
import {
    IMessageRequest,
    IMessageResponse
} from 'src/response/message/message-response.interface';
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
    @HttpResponse('kafka.produce')
    async produce(): Promise<IHttpResponse> {
        const message: IMessageRequest = {
            value: {
                from: '127.0.0.1'
            },
            key: `${new Date().valueOf()}`
        };
        const kafka: IMessageResponse = await this.client
            .send('nestjs.ack.topic', message)
            .toPromise();

        return kafka;
    }
}
