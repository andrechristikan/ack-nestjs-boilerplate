import { ApiKey } from '@generated/prisma-client';

export interface IApiKeyCacheService {
    getCacheByKey(key: string): Promise<ApiKey | null>;
    setCacheByKey(key: string, apiKey: ApiKey): Promise<void>;
    deleteCacheByKey(key: string): Promise<void>;
}
