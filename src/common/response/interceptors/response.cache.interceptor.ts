import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { CacheInterceptor as CacheBaseInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';

/**
 * Cache interceptor that namespaces response cache keys with a configured prefix.
 */
@Injectable()
export class ResponseCacheInterceptor extends CacheBaseInterceptor {
    private readonly cachePrefix: string;

    constructor(
        @Inject(CacheMainProvider) readonly cache: Cache,
        private readonly configService: ConfigService,
        protected readonly reflector: Reflector
    ) {
        super(cache, reflector);

        this.cachePrefix = this.configService.get<string>(
            'response.cachePrefix'
        )!;
    }

    protected trackBy(context: ExecutionContext): string | undefined {
        const key = super.trackBy(context);

        if (!key) {
            return undefined;
        }

        return `${this.cachePrefix}:${key}`;
    }
}
