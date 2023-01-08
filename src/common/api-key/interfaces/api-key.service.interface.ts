import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { ApiKeyUpdateNameDto } from 'src/common/api-key/dtos/api-key.update-name.dto';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseManyOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
} from 'src/common/database/interfaces/database.interface';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKeyEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity>;

    findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity>;

    findOneByActiveKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKeyEntity>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    active(_id: string, options?: IDatabaseOptions): Promise<ApiKeyEntity>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<ApiKeyEntity>;

    create(
        data: ApiKeyCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyEntity>;

    createRaw(
        data: ApiKeyCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKeyEntity>;

    updateName(
        _id: string,
        data: ApiKeyUpdateNameDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;

    updateDate(
        _id: string,
        data: ApiKeyUpdateDateDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;

    reset(
        _id: string,
        key: string,
        options?: IDatabaseOptions
    ): Promise<IApiKeyEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity>;

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
