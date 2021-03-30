import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import { Logger } from 'src/logger/logger.decorator';
import { Logger as LoggerService } from 'winston';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { IErrors } from 'src/message/message.interface';
import { IResponse } from 'src/response/response.interface';

export function RequestValidationPipe(schema: {
    new (...args: any[]): any;
}): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(
            @Response() private readonly responseService: ResponseService,
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

            const request: Record<string, any> = plainToClass(schema, value);

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
                const response: IResponse = this.responseService.error(
                    this.messageService.get('http.clientError.badRequest'),
                    errors
                );
                throw new BadRequestException(response);
            }
            return value;
        }

        private toValidate(metatype: Record<string, any>): boolean {
            const types: Record<string, any>[] = [
                String,
                Boolean,
                Number,
                Array,
                Object
            ];
            return types.includes(metatype);
        }
    }

    return mixin(MixinRequestValidationPipe);
}
