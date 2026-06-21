import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IMessageValidationError } from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Formats `RequestValidationException` into the standard error envelope with localized field errors.
 */
@Catch(RequestValidationException)
export class AppValidationFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    async catch(
        exception: RequestValidationException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        const metadata = this.responseMetadataService.create();

        const message = this.messageService.setMessage(exception.messagePath, {
            customLanguage: metadata.language,
        });
        const errors: IMessageValidationError[] =
            this.messageService.setValidationMessage(exception.errors, {
                customLanguage: metadata.language,
            });

        const responseBody: ResponseErrorDto = {
            statusCode: exception.statusCode,
            statusCodeKey: exception.statusCodeKey,
            module: exception.module,
            message,
            metadata,
            errors,
        };

        this.responseMetadataService.setHeaders(response, metadata);
        response.status(exception.httpStatus).json(responseBody);

        return;
    }
}
