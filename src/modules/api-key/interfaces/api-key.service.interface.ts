import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKey, EnumApiKeyType } from '@prisma/client';

export interface IApiKeyService {
    getListByAdmin(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKeyDto>>;
    createByAdmin({
        name,
        type,
        startAt,
        endAt,
    }: ApiKeyCreateRequestDto): Promise<
        IResponseReturn<ApiKeyCreateResponseDto>
    >;
    updateStatusByAdmin(
        id: string,
        data: ApiKeyUpdateStatusRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>>;
    updateByAdmin(
        id: string,
        { name }: ApiKeyUpdateRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>>;
    updateDatesByAdmin(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<IResponseReturn<ApiKeyDto>>;
    resetByAdmin(id: string): Promise<IResponseReturn<ApiKeyCreateResponseDto>>;
    deleteByAdmin(id: string): Promise<IResponseReturn<ApiKeyDto>>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null>;
    validateApiKey(apiKey: ApiKey, includeActive: boolean): void;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKey | null>;
    validateXApiKeyGuard(request: IRequestApp): Promise<ApiKey>;
    validateXApiKeyTypeGuard(
        request: IRequestApp,
        apiKeyTypes: EnumApiKeyType[]
    ): boolean;
}
