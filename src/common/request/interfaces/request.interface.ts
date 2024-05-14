import { Request } from 'express';
import { ResponsePagingMetadataPaginationDto } from 'src/common/response/dtos/response.paging.dto';

export interface IRequestApp<
    T = Record<string, any>,
    N = Record<string, any>,
    B = Record<string, any>,
> extends Request {
    apiKey?: B;
    user?: T;
    __user?: N;

    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationDto;
}
