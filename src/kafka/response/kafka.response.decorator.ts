import { applyDecorators, UseFilters } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { ErrorKafkaFilter } from '../error/kafka.error.filter';

export function KafkaResponse(topic: string): IAuthApplyDecorator {
    return applyDecorators(
        MessagePattern(topic, Transport.KAFKA),
        UseFilters(ErrorKafkaFilter)
    );
}
