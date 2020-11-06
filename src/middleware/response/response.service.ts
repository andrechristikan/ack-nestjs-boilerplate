import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Scope
} from '@nestjs/common';
import {
    IApiResponse,
    IPagination,
    ISetApiResponse,
} from 'middleware/response/response.interface';
import { Pagination } from 'middleware/response/response.constant'; 

@Injectable({ scope: Scope.TRANSIENT })
export class ResponseService {
    pagination(setPage: number, setLimit?: number): IPagination {
        const limit: number = Pagination || setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }

    success(data: ISetApiResponse): IApiResponse {
        const response: IApiResponse = {
            statusCode: data.statusCode,
            message: data.message,
        }

        if(data.options.data){
            response.data = data.options.data;
        }

        return response;
    }

    error(data: ISetApiResponse): IApiResponse {
        const httpCode = data.options.httpCode || 400;
        const response: IApiResponse = {
            statusCode: data.statusCode,
            message: data.message
        };

        if(data.options.data){
            response.data = data.options.data;
        }

        switch (httpCode) {
            case 400:
                throw new BadRequestException(response);
            default:
                throw new InternalServerErrorException(response);
        }
    }
}
