import { Module } from '@nestjs/common';
import { KafkaConsumerController } from './consumer.controller';

@Module({
    providers: [],
    exports: [],
    controllers: [KafkaConsumerController],
    imports: []
})
export class KafkaConsumerModule {}
