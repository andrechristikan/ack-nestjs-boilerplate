import { Injectable } from '@nestjs/common';
import { Admin, Kafka, KafkaConfig } from 'kafkajs';
import { Logger } from '@nestjs/common/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { KAFKA_TOPICS } from './kafka.constant';
@Injectable()
export class KafkaService {
    private readonly kafka: Kafka;
    private readonly admin: Admin;
    private readonly topics: string[];
    private readonly brokers: string[];
    private readonly name: string;
    private readonly clientId: string;
    private readonly kafkaOptions: KafkaConfig;

    protected logger = new Logger(KafkaService.name);

    constructor(private readonly configService: ConfigService) {
        this.brokers = this.configService.get<string[]>('kafka.brokers');
        this.topics = KAFKA_TOPICS;
        this.clientId = this.configService.get<string>('kafka.admin.clientId');
        this.kafkaOptions = {
            clientId: this.clientId,
            brokers: this.brokers
        };
        this.name = KafkaService.name;

        this.logger.log(`Starting ${this.name} ...`);
        this.kafka = new Kafka({
            clientId: this.kafkaOptions.clientId,
            brokers: this.brokers
        });

        this.admin = this.kafka.admin();
        this.logger.log(`${this.name} Admin Connected`);

        this.logger.log(`Brokers ${this.brokers.join(', ')}`);
        this.logger.log(`Topics ${this.topics.join(', ')}`);
    }

    async onModuleInit(): Promise<void> {
        await this.connect();

        await this.bindAllTopic();
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

    private async bindAllTopic(): Promise<void> {
        const topics: string[] = await this.getAllTopic();

        this.topics.forEach(async (topic) => {
            const checkTopic: number = topics.indexOf(topic);
            const checkTopicReply: number = topics.indexOf(`${topic}.reply`);

            if (checkTopic < 0) {
                await this.createTopic(topic);
            }

            if (checkTopicReply < 0) {
                await this.createTopic(`${topic}.reply`);
            }
        });
        return;
    }

    async getAllTopic(): Promise<string[]> {
        return this.admin.listTopics();
    }

    async createTopic(topic: string): Promise<boolean> {
        return this.admin.createTopics({
            waitForLeaders: true,
            topics: [
                {
                    topic: topic,
                    numPartitions: 3,
                    replicationFactor: this.brokers.length >= 3 ? 3 : 1
                }
            ]
        });
    }
}
