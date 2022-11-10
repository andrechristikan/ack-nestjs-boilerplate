import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';

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
