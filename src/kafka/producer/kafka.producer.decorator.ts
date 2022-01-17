import { Inject } from '@nestjs/common';
import { KafkaProducerService } from './kafka.producer.service';

export function KafkaProducer(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(KafkaProducerService);
}
