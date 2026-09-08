import { FeatureFlag } from '@generated/prisma-client';

export interface IFeatureFlagCacheService {
    getCacheByKey(key: string): Promise<FeatureFlag | null>;
    setCacheByKey(key: string, featureFlag: FeatureFlag): Promise<void>;
    deleteCacheByKey(key: string): Promise<void>;
    getByKeyAndCache(key: string): Promise<FeatureFlag | null>;
    getMetadataByKeyAndCache<T>(key: string): Promise<T | null>;
}
