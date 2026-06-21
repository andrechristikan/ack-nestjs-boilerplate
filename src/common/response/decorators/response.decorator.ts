import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePagingInterceptor } from '@common/response/interceptors/response.paging.interceptor';
import { IResponseOptions } from '@common/response/interfaces/response.interface';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';

/**
 * Standardizes a route's response via `ResponseInterceptor`; the handler must return
 * `IResponseReturn<T>`. `messagePath` is the i18n key; `options.cache` optionally enables caching.
 */
export function Response(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponseInterceptor),
        SetMetadata(ResponseMessagePathMetaKey, messagePath),
    ];

    if (options?.cache) {
        decorators.push(UseInterceptors(ResponseCacheInterceptor));

        if (typeof options?.cache !== 'boolean') {
            if (options?.cache?.key) {
                decorators.push(CacheKey(options?.cache?.key));
            }

            if (options?.cache?.ttl) {
                decorators.push(CacheTTL(options?.cache?.ttl));
            }
        }
    }

    return applyDecorators(...decorators);
}

/**
 * Standardizes a paginated route via `ResponsePagingInterceptor`; the handler must return
 * `IResponsePagingReturn<T>` (offset or cursor). `options.cache` optionally enables caching.
 */
export function ResponsePaging(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponsePagingInterceptor),
        SetMetadata(ResponseMessagePathMetaKey, messagePath),
    ];

    if (options?.cache) {
        decorators.push(UseInterceptors(ResponseCacheInterceptor));

        if (typeof options?.cache !== 'boolean') {
            if (options?.cache?.key) {
                decorators.push(CacheKey(options?.cache?.key));
            }

            if (options?.cache?.ttl) {
                decorators.push(CacheTTL(options?.cache?.ttl));
            }
        }
    }

    return applyDecorators(...decorators);
}

/**
 * Streams a file download via `ResponseFileInterceptor`; the handler must return
 * `IResponseFileReturn` (CSV or PDF).
 */
export function ResponseFile(): MethodDecorator {
    return applyDecorators(UseInterceptors(ResponseFileInterceptor));
}
