import { Module } from '@nestjs/common';
import { KafkaConsumerModule } from './consumer/consumer.module';
import { KafkaService } from './kafka.service';
import { KafkaProducerModule } from './producer/producer.module';

@Module({
    providers: [KafkaService],
    exports: [KafkaService],
    controllers: [],
    imports: [KafkaConsumerModule, KafkaProducerModule]
})
export class KafkaModule {}
