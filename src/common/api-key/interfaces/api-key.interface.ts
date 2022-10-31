import { ApiKeyEntity } from 'src/common/api-key/schemas/api-key.schema';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    name: string;
}

export type IApiKey = Partial<ApiKeyEntity> & { secret: string };

export interface IApiKeyRequestHashedData {
    key: string;
    timestamp: number;
    hash: string;
}

export interface IApiKeyEntity {
    name: string;
    description?: string;
    key: string;
    hash: string;
    encryptionKey: string;
    passphrase: string;
    isActive: boolean;
}
