import { Request } from 'express';
import { ApiKeyPayloadDto } from 'src/modules/api-key/dtos/api-key.payload.dto';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { ResponsePagingMetadataPaginationRequestDto } from 'src/common/response/dtos/response.paging.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';

export interface IRequestApp<T = AuthJwtAccessPayloadDto> extends Request {
    apiKey?: ApiKeyPayloadDto;
    user?: T;

    __user?: IUserDoc;
    __language: string;
    __version: string;

    __pagination?: ResponsePagingMetadataPaginationRequestDto;
}
