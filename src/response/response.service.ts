import { Injectable } from '@nestjs/common';
import { IErrors } from 'src/message/message.interface';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';

@Injectable()
export class ResponseService {
    constructor(@Message() private readonly messageService: MessageService) {}

    error(messagePath: string, errors?: IErrors[]): IResponse {
        const message: string = this.messageService.get(messagePath);

        if (errors) {
            return {
                message,
                errors
            };
        }

        return {
            message
        };
    }

    success(
        messagePath: string,
        data?: Record<string, any> | Record<string, any>[]
    ): IResponse {
        const message: string = this.messageService.get(messagePath);

        if (data) {
            return {
                message,
                data
            };
        }

        return {
            message
        };
    }

    paging(
        message: string,
        totalData: number,
        totalPage: number,
        currentPage: number,
        perPage: number,
        data: Record<string, any>[]
    ): IResponsePaging {
        return {
            message,
            totalData,
            totalPage,
            currentPage,
            perPage,
            data
        };
    }
}
