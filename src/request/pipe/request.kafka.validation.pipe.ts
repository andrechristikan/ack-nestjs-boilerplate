import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { validate } from 'class-validator';
import { Debugger } from 'src/debugger/debugger.decorator';
import { Logger as DebuggerService } from 'winston';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { plainToClass } from 'class-transformer';
import { IErrors } from 'src/error/error.interface';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';
import { ErrorKafkaException } from 'src/kafka/error/kafka.error.filter';

export class RequestKafkaValidationPipe implements PipeTransform {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService
    ) {}

    async transform(
        value: Record<string, any>,
        { metatype }: ArgumentMetadata
    ): Promise<Record<string, any>> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const request = plainToClass(metatype, value);
        this.debuggerService.info('Request Kafka Data', {
            class: 'RequestKafkaValidationPipe',
            function: 'transform',
            request: request
        });

        const rawErrors: Record<string, any>[] = await validate(request);
        if (rawErrors.length > 0) {
            const errors: IErrors[] = this.messageService.getRequestErrorsMessage(
                rawErrors
            );

            this.debuggerService.error('Request Kafka Errors', {
                class: 'RequestKafkaValidationPipe',
                function: 'transform',
                errors
            });

            throw new ErrorKafkaException(
                ENUM_ERROR_STATUS_CODE.REQUEST_VALIDATION_ERROR
            );
        }
        return value;
    }

    private toValidate(metatype: Record<string, any>): boolean {
        const types: Record<string, any>[] = [];
        return types.includes(metatype);
    }
}
