import { Injectable } from '@nestjs/common';
import { IErrors } from 'src/message/message.interface';
import { IResponse, IResponsePaging } from 'src/response/response.interface';

@Injectable()
export class ResponseService {
    error(message: string, errors?: IErrors[]): IResponse {
        if (errors) {
            return {
                message: message,
                errors: errors
            };
        }

        return {
            message: message
        };
    }

    success(
        message: string,
        data?: Record<string, any> | Record<string, any>[]
    ): IResponse {
        if (data) {
            return {
                message: message,
                data: data
            };
        }

        return {
            message: message
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
