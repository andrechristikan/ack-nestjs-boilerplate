import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { KafkaResponseFilter } from './kafka.response.filter';

export function KafkaResponse(topic: string): IAuthApplyDecorator {
    return applyDecorators(
        UseInterceptors(MessagePattern(topic, Transport.KAFKA)),
        UseFilters(KafkaResponseFilter)
    );
}
