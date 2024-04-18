import { Request } from 'express';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { ResponsePagingMetadataPaginationDto } from 'src/common/response/dtos/response.paging.dto';

export interface IRequestApp<T = AuthJwtAccessPayloadDto> extends Request {
    apiKey?: IApiKeyPayload;
    user?: T;

    __id: string;
    __timestamp: number;
    __timezone: string;
    __language: string;
    __version: string;
    __repoVersion: string;

    __pagination?: ResponsePagingMetadataPaginationDto;
}
