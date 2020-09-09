import { Injectable } from '@nestjs/common';
import { ConfigService } from 'config/config.service';
import {
    HttpSuccessStatusCode,
    ResponseSuccess,
    Pagination,
} from 'helper/helper.constant';

@Injectable()
export class HelperService {
    constructor(private readonly configService: ConfigService) {}
    pagination(setPage: number, setLimit?: number): Pagination {
        const limit: number =
            (this.configService.getConfig('pagination.user.limit') as number) ||
            setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }

    response(
        httpCode: HttpSuccessStatusCode,
        message: string,
        data?: Record<string, any> | Array<Record<string, any>>,
    ): ResponseSuccess {
        const response: ResponseSuccess = {
            statusCode: httpCode,
            httpCode,
            message,
            data,
        };
        return response;
    }
}
