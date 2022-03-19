import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Request, Response } from 'express';
import { IErrorHttpException } from './error.interface';
import { IMessage } from 'src/message/message.interface';
import { MessageService } from 'src/message/service/message.service';

@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(private readonly messageService: MessageService) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const statusHttp: number = exception.getStatus();
        const responseHttp: any = ctx.getResponse<Response>();

        const request: Request = ctx.getRequest<Request>();
        const { headers } = request;
        const appLanguages: string[] = headers['x-custom-lang']
            ? ctx.getRequest().i18nLang.split(',')
            : undefined;

        // Restructure
        const response = exception.getResponse() as IErrorHttpException;

        if (typeof response === 'object') {
            const { statusCode, message, errors, data } = response;
            const rErrors = errors
                ? await this.messageService.getRequestErrorsMessage(
                      errors,
                      appLanguages
                  )
                : undefined;
            const rMessage: string | IMessage = await this.messageService.get(
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
            const rMessage: string | IMessage = await this.messageService.get(
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
