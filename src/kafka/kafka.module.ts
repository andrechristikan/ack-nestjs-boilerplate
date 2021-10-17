import { Module } from '@nestjs/common';
import { KafkaConsumerModule } from './consumer/consumer.module';
import { KafkaService } from './kafka.service';
import { KafkaProducerModule } from './producer/producer.module';

@Module({
    imports: [KafkaConsumerModule, KafkaProducerModule],
    providers: [KafkaService],
    exports: [KafkaService],

    controllers: []
})
export class KafkaModule {}
