import {
    PipeTransform,
    ArgumentMetadata,
    BadRequestException,
    Type,
    mixin
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Response } from 'response/response.decorator';
import { ResponseService } from 'response/response.service';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';
import { Logger } from 'middleware/logger/logger.decorator';
import { Logger as LoggerService } from 'winston';
import {
    IApiErrorResponse,
    IApiErrorMessage
} from 'response/response.interface';
import { SystemErrorStatusCode } from 'response/response.constant';

export function RequestValidationPipe(schema: {
    new (...args: any[]): any;
}): Type<PipeTransform> {
    class MixinRequestValidationPipe implements PipeTransform {
        constructor(
            @Response() private readonly responseService: ResponseService,
            @Config() private readonly configService: ConfigService,
            @Logger() private readonly logger: LoggerService
        ) {}

        async transform(
            value: Record<string, any>,
            { metatype }: ArgumentMetadata
        ): Promise<Record<string, any>> {
            if (!metatype || !this.toValidate(metatype)) {
                return value;
            }

            const object: Record<string, any> = plainToClass(schema, value);
            const rawErrors: Record<string, any>[] = await validate(object);
            if (rawErrors.length > 0) {
                const errors: IApiErrorMessage[] = this.responseService.setRequestErrorMessage(
                    rawErrors
                );
                const response: IApiErrorResponse = this.responseService.error(
                    SystemErrorStatusCode.REQUEST_ERROR,
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
