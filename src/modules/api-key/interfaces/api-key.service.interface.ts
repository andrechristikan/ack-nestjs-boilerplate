import {
    IDatabaseFilterOperation,
    IDatabaseFilterOperationComparison,
} from '@common/database/interfaces/database.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { ENUM_API_KEY_TYPE } from '@modules/api-key/enums/api-key.enum';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

export interface IApiKeyService {
    getList(
        { search, limit, skip, order }: IPaginationQueryReturn,
        isActive?: Record<string, IDatabaseFilterOperationComparison>,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>>;
    mapList(apiKeys: ApiKeyEntity[]): ApiKeyResponseDto[];
    mapOne(apiKey: ApiKeyEntity): ApiKeyResponseDto;
    findOneByIdAndCache(_id: string): Promise<ApiKeyEntity>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKeyEntity | undefined>;
    create({
        description,
        type,
        startDate,
        endDate,
    }: ApiKeyCreateRequestDto): Promise<ApiKeyCreateResponseDto>;
    active(apiKeyId: string): Promise<ApiKeyResponseDto>;
    inactive(apiKeyId: string): Promise<ApiKeyResponseDto>;
    update(
        apiKeyId: string,
        { description }: ApiKeyUpdateRequestDto
    ): Promise<ApiKeyResponseDto>;
    updateDate(
        apiKeyId: string,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyResponseDto>;
    reset(apiKeyId: string): Promise<ApiKeyCreateResponseDto>;
    delete(apiKeyId: string): Promise<ApiKeyResponseDto>;
    getCacheByKey(key: string): Promise<ApiKeyEntity | null | undefined>;
    setCacheByKey(key: string, apiKey: ApiKeyEntity): Promise<void>;
    deleteCacheByKey(key: string): Promise<void>;
    validateXApiKey(request: IRequestApp): Promise<ApiKeyEntity>;
    validateXApiKeyType(
        request: IRequestApp,
        allowed: ENUM_API_KEY_TYPE[]
    ): ApiKeyEntity;
}
