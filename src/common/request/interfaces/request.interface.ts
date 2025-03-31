import { Request } from 'express';
import { ApiKeyPayloadDto } from 'src/modules/api-key/dtos/api-key.payload.dto';
import { ResponsePagingMetadataPaginationRequestDto } from 'src/common/response/dtos/response.paging.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';

export interface IRequestApp<T = IAuthJwtAccessTokenPayload> extends Request {
    apiKey?: ApiKeyPayloadDto;
    user?: T;

    __user?: IUserDoc;
    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationRequestDto;
}
