import { IFeatureFlagWithTargetUsers } from '@modules/feature-flag/interfaces/feature-flag.interface';

export interface IFeatureFlagCacheService {
    getCacheByKey(key: string): Promise<IFeatureFlagWithTargetUsers | null>;
    setCacheByKey(
        key: string,
        featureFlag: IFeatureFlagWithTargetUsers
    ): Promise<void>;
    deleteCacheByKey(key: string): Promise<void>;
    getByKeyAndCache(key: string): Promise<IFeatureFlagWithTargetUsers | null>;
    getMetadataByKeyAndCache<T>(key: string): Promise<T | null>;
}
