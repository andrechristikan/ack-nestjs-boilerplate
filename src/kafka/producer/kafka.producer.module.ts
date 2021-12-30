import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_PRODUCER_SERVICE_NAME } from './kafka.producer.constant';
import { KafkaProducerService } from './kafka.producer.service';

@Global()
@Module({})
export class KafkaProducerModule {
    static register({ env, active }): DynamicModule {
        if (env === 'testing' || !active) {
            return {
                module: KafkaProducerModule,
                providers: [],
                exports: [],
                controllers: [],
                imports: []
            };
        }

        return {
            module: KafkaProducerModule,
            providers: [KafkaProducerService],
            exports: [KafkaProducerService],
            controllers: [],
            imports: [
                ClientsModule.registerAsync([
                    {
                        name: KAFKA_PRODUCER_SERVICE_NAME,
                        inject: [ConfigService],
                        imports: [ConfigModule],
                        useFactory: async (configService: ConfigService) => ({
                            transport: Transport.KAFKA,
                            options: {
                                client: {
                                    clientId:
                                        configService.get<string>(
                                            'kafka.clientId'
                                        ),
                                    brokers:
                                        configService.get<string[]>(
                                            'kafka.brokers'
                                        )
                                },
                                consumer: {
                                    groupId: configService.get<string>(
                                        'kafka.consumerGroup'
                                    ),
                                    allowAutoTopicCreation: false
                                },
                                producer: {
                                    allowAutoTopicCreation: false
                                }
                            }
                        })
                    }
                ])
            ]
        };
    }
}
