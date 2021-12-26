import { applyDecorators, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ClassConstructor } from 'class-transformer';
import { ErrorRcpFilter } from '../error/kafka.error.filter';

export function KafkaRequest(
    topic: string,
    validation?: ClassConstructor<unknown>
): any {
    if (validation) {
        return applyDecorators(
            MessagePattern(topic, Transport.KAFKA),
            UseFilters(ErrorRcpFilter)
        );
    }

    return applyDecorators(
        MessagePattern(topic, Transport.KAFKA),
        UseFilters(ErrorRcpFilter)
    );
}
