import { ApiKey } from 'src/common/api-key/schemas/api-key.schema';

export interface IApiKeyPayload {
    _id: string;
    key: string;
    name: string;
}

export type IApiKey = Partial<ApiKey> & { secret: string };

export interface IApiKeyRequestHashedData {
    key: string;
    timestamp: number;
    hash: string;
}
