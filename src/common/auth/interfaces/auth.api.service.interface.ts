import {
    AuthApiCreateDto,
    AuthApiCreateRawDto,
} from 'src/common/auth/dtos/auth.api.create.dto';
import { AuthApiUpdateDto } from 'src/common/auth/dtos/auth.api.update.dto';
import {
    IAuthApi,
    IAuthApiRequestHashedData,
} from 'src/common/auth/interfaces/auth.interface';
import { AuthApiDocument } from 'src/common/auth/schemas/auth.api.schema';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';

export interface IAuthApiService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<AuthApiDocument[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<AuthApiDocument>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<AuthApiDocument>;

    findOneByKey(
        key: string,
        options?: IDatabaseFindOneOptions
    ): Promise<AuthApiDocument>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<AuthApiDocument>;

    active(_id: string, options?: IDatabaseOptions): Promise<AuthApiDocument>;

    create(
        data: AuthApiCreateDto,
        options?: IDatabaseCreateOptions
    ): Promise<IAuthApi>;

    createRaw(
        data: AuthApiCreateRawDto,
        options?: IDatabaseCreateOptions
    ): Promise<IAuthApi>;

    updateOneById(
        _id: string,
        data: AuthApiUpdateDto,
        options?: IDatabaseOptions
    ): Promise<AuthApiDocument>;

    updateHashById(_id: string, options?: IDatabaseOptions): Promise<IAuthApi>;

    deleteOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<AuthApiDocument>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<AuthApiDocument>;

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
    ): Promise<IAuthApiRequestHashedData>;

    encryptApiKey(
        data: IAuthApiRequestHashedData,
        encryptionKey: string,
        passphrase: string
    ): Promise<string>;

    createBasicToken(clientId: string, clientSecret: string): Promise<string>;

    validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean>;
}
