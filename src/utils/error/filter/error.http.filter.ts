import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { IMessage } from 'src/message/message.interface';
import { MessageService } from 'src/message/service/message.service';
import { IRequestApp } from 'src/utils/request/request.interface';
import { IErrorException } from '../error.interface';

@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(
        private readonly messageService: MessageService,
        private readonly debuggerService: DebuggerService
    ) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const statusHttp: number = exception.getStatus();
        const request = ctx.getRequest<IRequestApp>();
        const response = exception.getResponse() as IErrorException;
        const { customLang } = ctx.getRequest<IRequestApp>();
        const customLanguages: string[] = customLang.split(',');
        const responseExpress: Response = ctx.getResponse<Response>();

        // Debugger
        this.debuggerService.error(
            request && request.id ? request.id : ErrorHttpFilter.name,
            {
                description: exception.message,
                class: request.__class,
                function: request.__function,
            },
            exception
        );

        // Restructure
        if (typeof response === 'object') {
            const { statusCode, message, errors, data, properties } = response;

            const rErrors = errors
                ? await this.messageService.getRequestErrorsMessage(
                      errors,
                      customLanguages
                  )
                : undefined;

            let rMessage: string | IMessage = await this.messageService.get(
                message,
                { customLanguages }
            );

            if (properties) {
                rMessage = await this.messageService.get(message, {
                    customLanguages,
                    properties,
                });
            }

            responseExpress.status(statusHttp).json({
                statusCode: statusCode || statusHttp,
                message: rMessage,
                errors: rErrors,
                data,
            });
        } else {
            const rMessage: string | IMessage = await this.messageService.get(
                'response.error.structure',
                {
                    customLanguages,
                }
            );
            responseExpress.status(statusHttp).json({
                statusCode: statusHttp,
                message: rMessage,
            });
        }
    }
}
