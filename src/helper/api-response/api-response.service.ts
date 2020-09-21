import { Injectable, Scope } from '@nestjs/common';
import {
    HttpSuccessStatusCode,
    Pagination,
} from 'helper/api-response/api-response.constant';
import {
    IApiResponseSuccess,
    IPagination,
} from 'helper/api-response/api-response.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class ApiResponseService {
    pagination(setPage: number, setLimit?: number): IPagination {
        const limit: number = Pagination.limit || setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }

    response(
        httpCode: HttpSuccessStatusCode,
        message: string,
        data?: Record<string, any> | Array<Record<string, any>>,
    ): IApiResponseSuccess {
        const response: IApiResponseSuccess = {
            statusCode: httpCode,
            httpCode,
            message,
            data,
        };
        return response;
    }
}
