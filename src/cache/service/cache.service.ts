import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}
    async get<T>(key: string): Promise<T> {
        return this.cacheManager.get<T>(key);
    }

    async getTimezone(): Promise<string> {
        return this.cacheManager.get<string>('x-timezone');
    }

    async getTimestamp(): Promise<string> {
        return this.cacheManager.get<string>('x-timestamp');
    }

    async getRequestId(): Promise<string> {
        return this.cacheManager.get<string>('x-request-id');
    }

    async getCustomLang(): Promise<string> {
        return this.cacheManager.get<string>('x-custom-lang');
    }

    async set<T>(key: string, value: T): Promise<T> {
        return this.cacheManager.set<T>(key, value);
    }

    async setNoLimit<T>(key: string, value: T): Promise<T> {
        return this.cacheManager.set<T>(key, value, { ttl: 0 });
    }

    async delete(key: string): Promise<void> {
        return this.cacheManager.del(key);
    }

    async reset(): Promise<void> {
        return this.cacheManager.reset();
    }
}
