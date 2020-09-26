import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Scope
} from '@nestjs/common';
import { IApiError } from 'error/error.interface';
import { HttpSuccessStatusCode, Pagination } from 'response/response.constant';
import { SystemErrorStatusCode } from 'error/error.constant';
import {
    IApiResponseSuccess,
    IPagination,
    IApiResponseError
} from 'response/response.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class ResponseService {
    pagination(setPage: number, setLimit?: number): IPagination {
        const limit: number = Pagination.limit || setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }

    success(
        httpCode: HttpSuccessStatusCode,
        message: string,
        data?: Record<string, any> | Record<string, any>[]
    ): IApiResponseSuccess {
        const response: IApiResponseSuccess = {
            statusCode: httpCode,
            httpCode,
            message,
            data
        };
        return response;
    }

    error(response: IApiError): IApiResponseError {
        switch (response.httpCode) {
            case 400:
                throw new BadRequestException(response);
            default:
                throw new InternalServerErrorException(response);
        }
    }
}
