import { applyDecorators, UsePipes } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';
import { IAuthApplyDecorator } from 'src/auth/auth.interface';
import { RequestKafkaValidationPipe } from 'src/request/pipe/request.kafka.validation.pipe';

export function KafkaRequest(
    validation: ClassConstructor<unknown>
): IAuthApplyDecorator {
    return applyDecorators(UsePipes(RequestKafkaValidationPipe(validation)));
}
