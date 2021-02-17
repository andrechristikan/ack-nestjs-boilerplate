import { Injectable } from '@nestjs/common';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { MessageService } from 'src/message/message.service';
import { IMessageErrors, IMessage } from 'src/message/message.interface';
import {
    IResponseError,
    IResponseRaw,
    IResponseSuccess
} from 'src/response/response.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResponseService {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {}

    error(
        statusCode: AppErrorStatusCode,
        errors?: IMessageErrors[]
    ): IResponseError {
        const message: IMessage = this.messageService.set(statusCode);
        const response: IResponseError = {
            statusCode,
            message: message.message
        };

        if (errors) {
            response.errors = errors;
        }
        return response;
    }

    success(
        statusCode: AppSuccessStatusCode,
        data?: Record<string, any> | Record<string, any>[]
    ): IResponseSuccess {
        const message: IMessage = this.messageService.set(statusCode);
        const response: IResponseSuccess = {
            statusCode,
            message: message.message
        };

        if (data) {
            response.data = data;
        }
        return response;
    }

    raw(response: Record<string, any>): IResponseRaw {
        return response;
    }
}
