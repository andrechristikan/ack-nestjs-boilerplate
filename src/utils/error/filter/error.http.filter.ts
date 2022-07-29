import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { IMessage } from 'src/message/message.interface';
import { MessageService } from 'src/message/service/message.service';
import { IRequestApp } from 'src/utils/request/request.interface';
import { IErrorException, IValidationErrorImport } from '../error.interface';

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
        const response = exception.getResponse();
        const { customLang } = ctx.getRequest<IRequestApp>();
        const customLanguages: string[] = customLang
            ? customLang.split(',')
            : [];
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
        if (
            typeof response === 'object' &&
            'statusCode' in response &&
            'message' in response
        ) {
            const responseError = response as IErrorException;

            const {
                statusCode,
                message,
                errors,
                errorFromImport,
                data,
                properties,
            } = responseError;

            const rErrors = errors
                ? errorFromImport
                    ? await this.messageService.getImportErrorsMessage(
                          errors as IValidationErrorImport[],
                          customLanguages
                      )
                    : await this.messageService.getRequestErrorsMessage(
                          errors as ValidationError[],
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
        } else if (typeof response === 'string') {
            const message = await this.messageService.get(response, {
                customLanguages,
            });

            responseExpress.status(statusHttp).json({
                statusCode: statusHttp,
                message,
            });
        } else {
            const message = await this.messageService.get(
                `http.${statusHttp}`,
                {
                    customLanguages,
                }
            );

            responseExpress.status(statusHttp).json({
                statusCode: statusHttp,
                message,
                data: response,
            });
        }
    }
}
