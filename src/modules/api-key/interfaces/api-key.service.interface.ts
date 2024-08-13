import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { ApiKeyCreateResponseDto } from 'src/modules/api-key/dtos/response/api-key.create.dto';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import { ApiKeyResetResponseDto } from 'src/modules/api-key/dtos/response/api-key.reset.dto';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/modules/api-key/repository/entities/api-key.entity';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyDoc[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<ApiKeyDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<ApiKeyDoc>;
    findOneByKey(key: string, options?: IDatabaseOptions): Promise<ApiKeyDoc>;
    findOneByActiveKey(
        key: string,
        options?: IDatabaseOptions
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
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    inactiveManyByEndDate(
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean>;
    mapList(
        apiKeys: ApiKeyDoc[] | ApiKeyEntity[]
    ): Promise<ApiKeyListResponseDto[]>;
    mapGet(apiKey: ApiKeyDoc | ApiKeyEntity): Promise<ApiKeyGetResponseDto>;
}
