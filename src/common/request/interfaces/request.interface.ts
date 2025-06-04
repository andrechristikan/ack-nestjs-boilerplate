import { Request } from 'express';
import { ApiKeyPayloadDto } from '@module/api-key/dtos/api-key.payload.dto';
import { ResponsePagingMetadataPaginationRequestDto } from '@common/response/dtos/response.paging.dto';
import { IUserDoc } from '@module/user/interfaces/user.interface';
import { IAuthJwtAccessTokenPayload } from '@module/auth/interfaces/auth.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    apiKey?: ApiKeyPayloadDto;
    user?: T;

    __user?: IUserDoc;
    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationRequestDto;
}
