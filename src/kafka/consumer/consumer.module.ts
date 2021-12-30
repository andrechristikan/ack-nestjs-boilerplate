import { DynamicModule, Module } from '@nestjs/common';
import { KafkaConsumerController } from './consumer.controller';

@Module({})
export class KafkaConsumerModule {
    static register({ env }): DynamicModule {
        if (env === 'testing') {
            return {
                module: KafkaConsumerModule,
                providers: [],
                exports: [],
                controllers: [],
                imports: []
            };
        }

        return {
            module: KafkaConsumerModule,
            providers: [],
            exports: [],
            controllers: [KafkaConsumerController],
            imports: []
        };
    }
}
