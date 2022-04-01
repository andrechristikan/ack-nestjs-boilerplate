import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
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

        const appLanguages: string[] = ctx.getRequest().i18nLang
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

            let rMessage: string | IMessage = await this.messageService.get(
                'response.default',
                { appLanguages }
            );

            if (typeof message === 'object') {
                rMessage = await this.messageService.get(message.path, {
                    appLanguages,
                    properties: message.properties
                        ? message.properties
                        : undefined,
                });
            } else {
                rMessage = await this.messageService.get(message, {
                    appLanguages,
                });
            }

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
