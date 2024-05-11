import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from 'src/common/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/common/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/common/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/common/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/common/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/common/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/common/api-key/dtos/response/api-key.reset.dto';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc>;
    findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc>;
    findOneByActiveKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        { name, type, startDate, endDate }: ApiKeyCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto>;
    createRaw(
        {
            name,
            key,
            type,
            secret,
            startDate,
            endDate,
        }: ApiKeyCreateRawRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<ApiKeyCreateResponseDto>;
    active(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    inactive(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    update(
        repository: ApiKeyDoc,
        { name }: ApiKeyUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    updateDate(
        repository: ApiKeyDoc,
        { startDate, endDate }: ApiKeyUpdateDateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    reset(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyResetResponseDto>;
    delete(
        repository: ApiKeyDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    validateHashApiKey(hashFromRequest: string, hash: string): Promise<boolean>;
    createKey(): Promise<string>;
    createSecret(): Promise<string>;
    createHashApiKey(key: string, secret: string): Promise<string>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
    inactiveManyByEndDate(options?: IDatabaseManyOptions): Promise<boolean>;
    mapList(apiKeys: ApiKeyDoc[]): Promise<ApiKeyListResponseDto[]>;
    mapGet(apiKey: ApiKeyDoc): Promise<ApiKeyGetResponseDto>;
}
