import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { CacheInterceptor as CacheBaseInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';

/**
 * Response cache interceptor that extends the base CacheInterceptor functionality.
 * Adds configurable cache key prefixes to distinguish response caching from other cache operations.
 */
@Injectable()
export class ResponseCacheInterceptor extends CacheBaseInterceptor {
    private readonly cachePrefix: string;

    constructor(
        @Inject(CacheMainProvider) readonly cache: Cache,
        private readonly configService: ConfigService,
        readonly reflector: Reflector
    ) {
        super(cache, reflector);

        this.cachePrefix = this.configService.get<string>(
            'response.cachePrefix'
        );
    }

    /**
     * Generates cache key with configured prefix for response caching.
     * Overrides the base trackBy method to add response-specific cache prefixes.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {string | undefined} Prefixed cache key or undefined if no key generated
     */
    protected trackBy(context: ExecutionContext): string | undefined {
        const key = super.trackBy(context);

        if (!key) {
            return undefined;
        }

        return `${this.cachePrefix}:${key}`;
    }
}
