import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
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
        const appLanguages: string[] = headers['accept-language']
            ? (headers['accept-language'] as string).split(',')
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
