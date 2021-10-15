import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { IKafkaMessageResponse } from '../kafka.interface';
import { KAFKA_PRODUCER_SERVICE_NAME } from './producer.constant';

@Controller('kafka/produce')
export class KafkaProducerController {
    constructor(
        @Inject(KAFKA_PRODUCER_SERVICE_NAME)
        private readonly client: ClientKafka,
        private readonly configService: ConfigService
    ) {}

    async onModuleInit(): Promise<void> {
        this.configService
            .get<string[]>('kafka.topics')
            .forEach((val) => this.client.subscribeToResponseOf(val));

        await this.client.connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.close();
    }

    @Get('/')
    @Response('kafka.produce')
    async produce(): Promise<IResponse> {
        const kafka: IKafkaMessageResponse = await this.client
            .send('nestjs.ack.topic', {
                value: '127.0.0.1',
                key: new Date().valueOf()
            })
            .toPromise();

        return kafka;
    }
}
