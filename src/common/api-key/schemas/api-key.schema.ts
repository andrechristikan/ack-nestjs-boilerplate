import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { DatabaseEntity } from 'src/common/database/schemas/database.schema';

export class ApiKeyEntity extends DatabaseEntity implements IApiKeyEntity {
    name: string;
    description?: string;
    key: string;
    hash: string;
    encryptionKey: string;
    passphrase: string;
    isActive: boolean;
}

export const ApiKeyDatabaseName = 'apikeys';
