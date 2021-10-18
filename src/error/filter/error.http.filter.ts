import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Response } from 'express';
import { ENUM_ERROR_STATUS_CODE, ERROR_MESSAGE } from '../error.constant';
import {
    IErrorHttpException,
    IErrorHttpExceptionOptions,
    IErrors
} from '../error.interface';

// Restructure Response Object For Guard Exception
@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(@Message() private readonly messageService: MessageService) {}

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const responseHttp: any = ctx.getResponse<Response>();

        const statusHttp: number = exception.getStatus();
        const response: IErrorHttpExceptionOptions = exception.getResponse() as IErrorHttpExceptionOptions;
        const responseError: IErrorHttpException =
            ERROR_MESSAGE[ENUM_ERROR_STATUS_CODE[statusHttp]];

        // Restructure
        const httpCode: number = responseError.httpCode;
        const statusCode: number = statusHttp;
        const errors: IErrors[] =
            response && response.errors && response.errors.length > 0
                ? response.errors
                : undefined;
        const message: string =
            response && response.message
                ? response.message
                : (this.messageService.get(
                      responseError.messagePath
                  ) as string);

        responseHttp.status(httpCode).json({
            statusCode: statusCode,
            message,
            errors
        });
    }
}

export class ErrorHttpException extends HttpException {
    constructor(
        statusCode: ENUM_ERROR_STATUS_CODE,
        options?: IErrorHttpExceptionOptions
    ) {
        super(options || undefined, statusCode);
    }
}
