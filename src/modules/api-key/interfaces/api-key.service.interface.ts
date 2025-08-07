import {
    IDatabaseFilterOperation,
    IDatabaseFilterOperationComparison,
} from '@common/database/interfaces/database.interface';
import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from '@modules/api-key/dtos/response/api-key.create.response.dto';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { ApiKeyEntity } from '@modules/api-key/repository/entities/api-key.entity';

export interface IApiKeyService {
    findAllWithPagination(
        { search, limit, skip, order }: IPaginationQueryReturn,
        isActive?: Record<string, IDatabaseFilterOperationComparison>,
        type?: Record<string, IDatabaseFilterOperation>
    ): Promise<IResponsePagingReturn<ApiKeyResponseDto>>;
    mapList(apiKeys: Partial<ApiKeyEntity>[]): ApiKeyResponseDto[];
    mapOne(apiKey: Partial<ApiKeyEntity>): ApiKeyResponseDto;
    findOneByIdAndCache(id: string): Promise<ApiKeyEntity | undefined>;
    findOneActiveByKeyAndCache(key: string): Promise<ApiKeyEntity | undefined>;
    create({
        description,
        type,
        startDate,
        endDate,
    }: ApiKeyCreateRequestDto): Promise<ApiKeyCreateResponseDto>;
    active(apiKey: ApiKeyEntity): Promise<ApiKeyResponseDto>;
    inactive(apiKey: ApiKeyEntity): Promise<ApiKeyResponseDto>;
    update(
        apiKey: ApiKeyEntity,
        { description }: ApiKeyUpdateRequestDto
    ): Promise<ApiKeyResponseDto>;
    updateDate(
        apiKey: ApiKeyEntity,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKeyResponseDto>;
    reset(apiKey: ApiKeyEntity): Promise<ApiKeyCreateResponseDto>;
    delete(apiKey: ApiKeyEntity): Promise<ApiKeyResponseDto>;
    validateApiKey(key: string, secret: string, apiKey: ApiKeyEntity): boolean;
    createKey(): string;
    createSecret(): string;
    createHashApiKey(key: string, secret: string): string;
    getCacheByKey(key: string): Promise<ApiKeyEntity | null | undefined>;
    setCacheByKey(key: string, apiKey: ApiKeyEntity): Promise<void>;
    deleteCacheByKey(key: string): Promise<void>;
}
