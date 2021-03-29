import { Injectable } from '@nestjs/common';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { MessageService } from 'src/message/message.service';
import { IMessageErrors, IMessage } from 'src/message/message.interface';
import {
    IResponseError,
    IResponseSuccess
} from 'src/response/response.interface';

@Injectable()
export class ResponseService {
    constructor(private readonly messageService: MessageService) {}

    error(
        statusCode: AppErrorStatusCode,
        errors?: IMessageErrors[]
    ): IResponseError {
        const message: IMessage = this.messageService.set(statusCode);

        if (errors) {
            return {
                statusCode,
                message: message.message,
                errors: errors
            };
        }

        return {
            statusCode,
            message: message.message
        };
    }

    success(
        statusCode: AppSuccessStatusCode,
        data?: Record<string, any> | Record<string, any>[]
    ): IResponseSuccess {
        const message: IMessage = this.messageService.set(statusCode);

        if (data) {
            return {
                statusCode,
                message: message.message,
                data: data
            };
        }

        return {
            statusCode,
            message: message.message
        };
    }

    raw(response: Record<string, any>): Record<string, any> {
        return response;
    }
}
