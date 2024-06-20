import { Request } from 'express';
import { ApiKeyPayloadDto } from 'src/common/api-key/dtos/api-key.payload.dto';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { ResponsePagingMetadataPaginationDto } from 'src/common/response/dtos/response.paging.dto';

export interface IRequestApp<
    T = AuthJwtAccessPayloadDto,
    B = ApiKeyPayloadDto,
    N = Record<string, any>,
> extends Request {
    apiKey?: B;
    user?: T;
    __user?: N;

    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationDto;
}
