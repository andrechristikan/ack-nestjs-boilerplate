import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IErrorException } from './error.interface';
import { IMessage } from 'src/message/message.interface';
import { MessageService } from 'src/message/service/message.service';
import { CacheService } from 'src/cache/service/cache.service';

@Catch(HttpException)
export class ErrorHttpFilter implements ExceptionFilter {
    constructor(
        private readonly cacheService: CacheService,
        private readonly messageService: MessageService
    ) {}

    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const statusHttp: number = exception.getStatus();
        const responseHttp: any = ctx.getResponse<Response>();

        const customLanguages: string[] = (
            await this.cacheService.get<string>('x-custom-lang')
        ).split(',');

        // Restructure
        const response = exception.getResponse() as IErrorException;
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

            responseHttp.status(statusHttp).json({
                statusCode,
                message: rMessage,
                errors: rErrors,
                data,
            });
        } else {
            const rMessage: string | IMessage = await this.messageService.get(
                'response.error.structure',
                { customLanguages }
            );
            responseHttp.status(statusHttp).json({
                statusCode: 500,
                message: rMessage,
            });
        }
    }
}
