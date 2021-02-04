import { Injectable } from '@nestjs/common';
import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'logger/logger.decorator';
import { MessageService } from 'message/message.service';
import { IMessageErrors, IMessage } from 'message/message.interface';
import { IResponseError, IResponseSuccess } from 'response/response.interface';

@Injectable()
export class ResponseService {
    constructor(
        @Logger() private readonly logger: LoggerService,
        private readonly messageService: MessageService
    ) {}

    error(
        statusCode: AppErrorStatusCode,
        errors?: IMessageErrors[]
    ): IResponseError {
        const message: IMessage = this.messageService.set(statusCode);
        const response: IResponseError = {
            statusCode,
            message: message.message,
            errors
        };

        this.logger.error('Error', response);
        return response;
    }

    success(
        statusCode: AppSuccessStatusCode,
        data?: Record<string, any> | Record<string, any>[]
    ): IResponseSuccess {
        const message: IMessage = this.messageService.set(statusCode);
        const response: IResponseSuccess = {
            statusCode,
            message: message.message,
            data
        };

        this.logger.info('Success', response);
        return response;
    }

    raw(response: Record<string, any>): Record<string, any> {
        this.logger.info('Raw', response);
        return response;
    }
}
