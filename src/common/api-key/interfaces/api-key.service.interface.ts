import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import {
    IApiKey,
    IApiKeyRequestHashedData,
} from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKey } from 'src/common/api-key/schemas/api-key.schema';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';

export interface IApiKeyService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ApiKey[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKey>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKey>;

    findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ApiKey>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<ApiKey>;

    active(_id: string, options?: IDatabaseOptions): Promise<ApiKey>;

    create(
        data: ApiKeyCreateDto,
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
    ): Promise<ApiKey>;

    updateHashById(_id: string, options?: IDatabaseOptions): Promise<IApiKey>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKey>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<ApiKey>;

    createKey(): Promise<string>;

    createEncryptionKey(): Promise<string>;

    createSecret(): Promise<string>;

    createPassphrase(): Promise<string>;

    createHashApiKey(key: string, secret: string): Promise<string>;

    validateHashApiKey(hashFromRequest: string, hash: string): Promise<boolean>;

    decryptApiKey(
        encryptedApiKey: string,
        encryptionKey: string,
        passphrase: string
    ): Promise<IApiKeyRequestHashedData>;

    encryptApiKey(
        data: IApiKeyRequestHashedData,
        encryptionKey: string,
        passphrase: string
    ): Promise<string>;

    createBasicToken(clientId: string, clientSecret: string): Promise<string>;

    validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean>;
}
