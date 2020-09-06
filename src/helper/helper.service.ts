import { Injectable } from '@nestjs/common';
import { ConfigService } from 'config/config.service';
import { HttpSuccessStatusCode } from 'helper/helper.constant';

@Injectable()
export class HelperService {
    constructor(private readonly configService: ConfigService) {}
    paging(setPage: number, setLimit?: number): Record<string, any> {
        const limit: number =
            (this.configService.getConfig('paging.user.limit') as number) ||
            setLimit;
        const page = setPage || 1;

        const skip: number = (page - 1) * limit;
        return { skip, limit: Number(limit) };
    }

    response(
        httpCode: HttpSuccessStatusCode,
        message: string,
        data?: Record<string, any> | Array<Record<string, any>>,
    ): Record<string, any> {
        const response: Record<string, any> = {
            statusCode: httpCode,
            httpCode,
            message,
            data,
        };
        return response;
    }
}
