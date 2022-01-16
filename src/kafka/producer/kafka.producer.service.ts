import {
    Inject,
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
    Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { KAFKA_TOPICS } from '../kafka.constant';
import { IKafkaRequest } from '../request/kafka.request.interface';
import { IKafkaResponse } from '../response/kafka.response.interface';
import { KAFKA_PRODUCER_SERVICE_NAME } from './kafka.producer.constant';

@Injectable()
export class KafkaProducerService
    implements OnApplicationBootstrap, OnModuleDestroy
{
    private readonly testMode: boolean;
    protected logger = new Logger(KafkaProducerService.name);

    constructor(
        @Helper() private readonly helperService: HelperService,
        @Optional()
        @Inject(KAFKA_PRODUCER_SERVICE_NAME)
        private readonly kafka: ClientKafka,
        private readonly configService: ConfigService
    ) {
        this.testMode = this.configService.get<string>('app.env') === 'testing';
    }

    async onApplicationBootstrap(): Promise<void> {
        if (this.testMode) {
            return;
        }

        const topics: string[] = [...new Set(KAFKA_TOPICS)];
        topics.forEach((val) => {
            this.kafka.subscribeToResponseOf(val);
        });

        await this.kafka.connect();

        this.logger.log('Kafka Client Connected');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.testMode) {
            return;
        }

        await this.kafka.close();
    }

    async send(
        topic: string,
        data: Record<string, string>,
        headers?: Record<string, string>
    ): Promise<IKafkaResponse> {
        if (this.testMode) {
            return;
        }

        const request: IKafkaRequest<Record<string, string>> = {
            key: await this.createId(),
            value: data,
            headers: headers || {},
        };

        return this.kafka.send(topic, request).toPromise();
    }

    private async createId(): Promise<string> {
        const rand: string = await this.helperService.randomString(10);
        const timestamp = `${new Date().valueOf()}`;
        return `${timestamp}-${rand}`;
    }
}
