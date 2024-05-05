import { Request } from 'express';
import { ResponsePagingMetadataPaginationDto } from 'src/common/response/dtos/response.paging.dto';

export interface IRequestApp<T = Record<string, any>, N = Record<string, any>>
    extends Request {
    apiKey?: N;
    user?: T;

    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationDto;
}
