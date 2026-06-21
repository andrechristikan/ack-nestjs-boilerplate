import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { FileImportException } from '@common/file/exceptions/file.import.exception';
import { IMessageValidationImportError } from '@common/message/interfaces/message.interface';
import { MessageService } from '@common/message/services/message.service';
import { ResponseErrorDto } from '@common/response/dtos/response.error.dto';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Formats `FileImportException` into the standard error envelope with localized per-row errors.
 */
@Catch(FileImportException)
export class AppValidationImportFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    async catch(
        exception: FileImportException,
        host: ArgumentsHost
    ): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();

        const metadata = this.responseMetadataService.create();

        const message = this.messageService.setMessage(exception.messagePath, {
            customLanguage: metadata.language,
        });
        const errors: IMessageValidationImportError[] =
            this.messageService.setValidationImportMessage(exception.errors, {
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
