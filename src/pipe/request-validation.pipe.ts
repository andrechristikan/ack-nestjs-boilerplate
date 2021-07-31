import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin
} from '@nestjs/common';
import { validate } from 'class-validator';
import { Logger } from 'src/logger/logger.decorator';
import { Logger as LoggerService } from 'winston';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { IErrors } from 'src/message/message.interface';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { plainToClass } from 'class-transformer';

export function RequestValidationPipe(schema: {
    new (...args: any[]): any;
}): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(
            @Message() private readonly messageService: MessageService,
            @Logger() private readonly logger: LoggerService
        ) {}

        async transform(
            value: Record<string, any>,
            { metatype }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!metatype || !this.toValidate(metatype)) {
                return value;
            }

            const request = plainToClass(schema, value);
            this.logger.info('Request Data', {
                class: 'RequestValidationPipe',
                function: 'transform',
                request: request
            });

            const rawErrors: Record<string, any>[] = await validate(request);
            if (rawErrors.length > 0) {
                const errors: IErrors[] = this.messageService.getRequestErrorsMessage(
                    rawErrors
                );

                this.logger.error('Request Errors', {
                    class: 'RequestValidationPipe',
                    function: 'transform',
                    errors
                });

                throw new BadRequestException(
                    errors,
                    this.messageService.get('http.clientError.badRequest')
                );
            }
            return value;
        }

        private toValidate(metatype: Record<string, any>): boolean {
            const types: Record<string, any>[] = [
                UserUpdateValidation,
                UserCreateValidation
            ];
            return types.includes(metatype);
        }
    }

    return mixin(MixinRequestValidationPipe);
}
