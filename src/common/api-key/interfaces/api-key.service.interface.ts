import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { IApiKeyCreated } from 'src/common/api-key/interfaces/api-key.interface';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/common/api-key/repository/entities/api-key.entity';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]>;
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
        { name, startDate, endDate }: ApiKeyCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyCreated>;
    createRaw(
        { name, key, secret, startDate, endDate }: ApiKeyCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyCreated>;
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
        { name }: ApiKeyUpdateDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    updateDate(
        repository: ApiKeyDoc,
        { startDate, endDate }: ApiKeyUpdateDateDto,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
    reset(
        repository: ApiKeyDoc,
        secret: string,
        options?: IDatabaseSaveOptions
    ): Promise<ApiKeyDoc>;
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
}
