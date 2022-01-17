import { applyDecorators, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { ClassConstructor } from 'class-transformer';
import { ErrorRcpFilter } from '../error/kafka.error.filter';
import { RequestKafkaValidationPipe } from './pipe/request.kafka.validation.pipe';

export function KafkaRequest(
    topic: string,
    classValidation?: ClassConstructor<any>
): any {
    if (classValidation) {
        return applyDecorators(
            MessagePattern(topic, Transport.KAFKA),
            UseFilters(ErrorRcpFilter),
            UsePipes(RequestKafkaValidationPipe(classValidation))
        );
    }

    return applyDecorators(
        MessagePattern(topic, Transport.KAFKA),
        UseFilters(ErrorRcpFilter)
    );
}
