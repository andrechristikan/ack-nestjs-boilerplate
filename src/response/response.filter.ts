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
import {
    ENUM_RESPONSE_STATUS_CODE,
    RESPONSE_CUSTOM_ERROR
} from './response.constant';
import {
    IResponseCustomError,
    IResponseCustomErrorOptions
} from './response.interface';
import { IErrors } from 'src/message/message.interface';

// Restructure Response Object For Guard Exception
@Catch(HttpException)
export class ResponseFilter implements ExceptionFilter {
    constructor(@Message() private readonly messageService: MessageService) {}

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const responseHttp: any = ctx.getResponse<Response>();

        const statusHttp: number = exception.getStatus();
        const response: IResponseCustomErrorOptions = exception.getResponse() as IResponseCustomErrorOptions;
        const responseError: IResponseCustomError =
            RESPONSE_CUSTOM_ERROR[ENUM_RESPONSE_STATUS_CODE[statusHttp]];

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

export class CustomHttpException extends HttpException {
    constructor(
        statusCode: ENUM_RESPONSE_STATUS_CODE,
        options?: IResponseCustomErrorOptions
    ) {
        super(options || undefined, statusCode);
    }
}
