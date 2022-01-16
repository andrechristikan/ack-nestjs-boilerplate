import { DynamicModule, Module } from '@nestjs/common';
import { KafkaAdminModule } from '../admin/kafka.admin.module';
import { KafkaConsumerController } from '../consumer/consumer.controller';
import { KafkaProducerController } from '../producer/kafka.producer.controller';
import { KafkaProducerModule } from '../producer/kafka.producer.module';

@Module({})
export class RouterKafkaModule {
    static register({ env, active }): DynamicModule {
        if (env === 'testing' || !active) {
            return {
                module: RouterKafkaModule,
                providers: [],
                exports: [],
                controllers: [],
                imports: [],
            };
        }

        return {
            module: RouterKafkaModule,
            controllers: [KafkaConsumerController, KafkaProducerController],
            providers: [],
            exports: [],
            imports: [
                KafkaAdminModule,
                KafkaProducerModule,
                KafkaProducerModule,
            ],
        };
    }
}
