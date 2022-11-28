import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { IApiKey } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
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

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<ApiKeyEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<ApiKeyEntity>;

    create(
        data: ApiKeyCreateDto,
        user: Record<string, any>,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKey>;

    createRaw(
        data: ApiKeyCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IApiKey>;

    updateOneById(
        _id: string,
        data: ApiKeyUpdateDto,
        options?: IDatabaseOptions
    ): Promise<ApiKeyEntity>;

    updateHashById(_id: string, options?: IDatabaseOptions): Promise<IApiKey>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKeyEntity>;

    createKey(): Promise<string>;

    createSecret(): Promise<string>;

    createHashApiKey(key: string, secret: string): Promise<string>;
    validateHashApiKey(hashFromRequest: string, hash: string): Promise<boolean>;
}
