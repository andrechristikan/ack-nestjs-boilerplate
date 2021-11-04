import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { KAFKA_TOPICS } from '../kafka.constant';
import { IKafkaRequest } from '../request/kafka.request.interface';
import { IKafkaResponse } from '../response/kafka.response.interface';
import { KAFKA_PRODUCER_SERVICE_NAME } from './kafka.producer.constant';

@Injectable()
export class KafkaProducerService
    implements OnApplicationBootstrap, OnModuleDestroy {
    protected logger = new Logger(KafkaProducerService.name);

    constructor(
        @Helper() private readonly helperService: HelperService,
        @Inject(KAFKA_PRODUCER_SERVICE_NAME)
        private readonly kafka: ClientKafka
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const topics: string[] = [...new Set(KAFKA_TOPICS)];
        topics.forEach((val) => {
            this.kafka.subscribeToResponseOf(val);
        });

        await this.kafka.connect();

        this.logger.log('Kafka Client Connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.kafka.close();
    }

    async send(
        topic: string,
        data: Record<string, any>,
        headers?: Record<string, any>
    ): Promise<IKafkaResponse> {
        const request: IKafkaRequest<Record<string, any>> = {
            key: await this.createId(),
            value: data,
            headers
        };

        this.kafka.send(topic, request).toPromise();

        return;
    }

    async sendAwait(
        topic: string,
        data: Record<string, any>,
        headers?: Record<string, any>
    ): Promise<IKafkaResponse> {
        const request: IKafkaRequest<Record<string, any>> = {
            key: await this.createId(),
            value: data,
            headers
        };

        return this.kafka.send(topic, request).toPromise();
    }

    private async createId() {
        const rand: string = await this.helperService.randomString(10);
        const timestamp: string = `${new Date().valueOf()}`;
        return `${timestamp}-${rand}`;
    }
}
