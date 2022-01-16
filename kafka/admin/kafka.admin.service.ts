import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, KafkaConfig } from 'kafkajs';
import { Logger } from '@nestjs/common/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { ITopicConfig } from '@nestjs/microservices/external/kafka.interface';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { KAFKA_TOPICS } from 'src/kafka/kafka.constant';

@Injectable()
export class KafkaAdminService implements OnModuleInit, OnModuleDestroy {
    private readonly kafka: Kafka;
    private readonly admin: Admin;
    private readonly topics: string[];
    private readonly brokers: string[];
    private readonly name: string;
    private readonly clientId: string;
    private readonly kafkaOptions: KafkaConfig;
    private readonly defaultPartition: number;

    protected logger = new Logger(KafkaAdminService.name);

    constructor(
        @Helper() private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {
        this.brokers = this.configService.get<string[]>('kafka.brokers');
        this.topics = [...new Set(KAFKA_TOPICS)];
        this.clientId = this.configService.get<string>('kafka.admin.clientId');
        this.kafkaOptions = {
            clientId: this.clientId,
            brokers: this.brokers,
        };
        this.name = KafkaAdminService.name;
        this.defaultPartition = this.configService.get<number>(
            'kafka.admin.defaultPartition'
        );

        this.logger.log(`Starting ${this.name} ...`);
        this.logger.log(`Brokers ${this.brokers}`);
        this.logger.log(`Topics ${this.topics}`);

        this.kafka = new Kafka(this.kafkaOptions);

        this.logger.log(`Connecting ${this.name} Admin ...`);
        this.admin = this.kafka.admin();
    }

    async onModuleInit(): Promise<void> {
        await this.connect();
        const currentTopicUnique: string[] = await this.getAllTopicUnique();

        if (
            JSON.stringify(currentTopicUnique) !== JSON.stringify(this.topics)
        ) {
            await this.createTopics();
            await this.helperService.delay(10000);
        }

        this.logger.log(`${this.name} Admin Connected`);
        this.logger.log(`${this.name} Topic Created`);
        this.logger.log(`${this.name} Connected`);
    }

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        await this.admin.connect();
    }

    private async disconnect(): Promise<void> {
        await this.admin.disconnect();
    }

    private async getAllTopic(): Promise<string[]> {
        return this.admin.listTopics();
    }

    private async getAllTopicUnique(): Promise<string[]> {
        return [...new Set(await this.getAllTopic())]
            .sort()
            .filter((val) => val !== '__consumer_offsets');
    }

    private async createTopics(): Promise<boolean> {
        const currentTopic: string[] = await this.getAllTopicUnique();
        const topics: string[] = this.topics;
        const replyTopic: string[] = this.topics.map((val) => `${val}.reply`);
        const data: ITopicConfig[] = [];

        topics.forEach((val) => {
            const topic: string = val;

            if (!currentTopic.includes(topic)) {
                data.push({
                    topic,
                    numPartitions: this.defaultPartition,
                    replicationFactor: this.brokers.length,
                });
            }
        });

        replyTopic.forEach((val) => {
            const topic: string = val;

            if (!currentTopic.includes(topic)) {
                data.push({
                    topic,
                    numPartitions: this.defaultPartition,
                    replicationFactor: this.brokers.length,
                });
            }
        });

        if (data && data.length > 0) {
            this.admin.createTopics({
                waitForLeaders: true,
                topics: data,
            });
        }

        return true;
    }
}
