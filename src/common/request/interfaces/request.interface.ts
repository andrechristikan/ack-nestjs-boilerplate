import { Request } from 'express';
import { ApiKeyPayloadDto } from 'src/modules/api-key/dtos/api-key.payload.dto';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { ResponsePagingMetadataPaginationDto } from 'src/common/response/dtos/response.paging.dto';

export interface IRequestApp<T = AuthJwtAccessPayloadDto, B = ApiKeyPayloadDto>
    extends Request {
    apiKey?: B;
    user?: T;

    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationDto;
}
