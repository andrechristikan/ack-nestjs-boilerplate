import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const ApiKeyDatabaseName = 'apikeys';
export const ApiKeyRepositoryName = 'ApiKeyRepository';

export class ApiKeyEntity extends DatabaseEntityAbstract {
    name: string;
    description?: string;
    key: string;
    hash: string;
    encryptionKey: string;
    passphrase: string;
    isActive: boolean;
}
