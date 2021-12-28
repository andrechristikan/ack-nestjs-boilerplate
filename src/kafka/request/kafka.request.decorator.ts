import { applyDecorators, UseFilters } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ErrorRcpFilter } from '../error/kafka.error.filter';

export function KafkaRequest(topic: string): any {
    return applyDecorators(
        MessagePattern(topic, Transport.KAFKA),
        UseFilters(ErrorRcpFilter)
    );
}
