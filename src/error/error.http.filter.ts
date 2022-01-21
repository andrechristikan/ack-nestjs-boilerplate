import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Request, Response } from 'express';
import { IErrorHttpException } from './error.interface';
import { IMessage } from 'src/message/message.interface';

@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(@Message() private readonly messageService: MessageService) {}

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const statusHttp: number = exception.getStatus();
        const responseHttp: any = ctx.getResponse<Response>();

        const request: Request = ctx.getRequest<Request>();
        const { headers } = request;
        const appLanguages: string[] = headers['Accept-Languages']
            ? (headers['Accept-Languages'] as string).split(',')
            : undefined;

        // Restructure
        const response = exception.getResponse() as IErrorHttpException;

        if (typeof response === 'string') {
            const rMessage: string | IMessage[] = this.messageService.get(
                response,
                {
                    appLanguages,
                }
            );
            responseHttp.status(statusHttp).json({
                statusCode: statusHttp,
                message: rMessage,
            });
        } else if (typeof response === 'object') {
            const { statusCode, message, errors, data } = response;
            const rErrors = errors
                ? this.messageService.getRequestErrorsMessage(
                      errors,
                      appLanguages
                  )
                : undefined;
            const rMessage: string | IMessage[] = this.messageService.get(
                message,
                { appLanguages }
            );

            responseHttp.status(statusHttp).json({
                statusCode,
                message: rMessage,
                errors: rErrors,
                data,
            });
        } else {
            const rMessage: string | IMessage[] = this.messageService.get(
                'response.error.structure',
                { appLanguages }
            );
            responseHttp.status(statusHttp).json({
                statusCode: 500,
                message: rMessage,
            });
        }
    }
}

// in case we want to return 2 success end point, with custom status code for both
export class SuccessException extends HttpException {
    constructor(
        data: Record<string, any> | string,
        httpCode?:
            | HttpStatus.OK
            | HttpStatus.CREATED
            | HttpStatus.ACCEPTED
            | HttpStatus.NON_AUTHORITATIVE_INFORMATION
            | HttpStatus.NO_CONTENT
            | HttpStatus.RESET_CONTENT
            | HttpStatus.PARTIAL_CONTENT
    ) {
        super(data, httpCode || HttpStatus.OK);
    }
}
