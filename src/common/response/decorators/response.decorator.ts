import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { RESPONSE_MESSAGE_PATH_META_KEY } from '@common/response/constants/response.constant';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePagingInterceptor } from '@common/response/interceptors/response.paging.interceptor';
import { IResponseOptions } from '@common/response/interfaces/response.interface';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';

/**
 * Decorator for standard API responses with optional caching.
 *
 * @param messagePath - Path to response message
 * @param options - Response configuration options
 * @returns Method decorator function
 */
export function Response(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponseInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
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
 * Decorator for paginated API responses with optional caching.
 *
 * @param messagePath - Path to response message
 * @param options - Response configuration options
 * @returns Method decorator function
 */
export function ResponsePaging(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponsePagingInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
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
 * Decorator for file download responses.
 *
 * @returns Method decorator function
 */
export function ResponseFile(): MethodDecorator {
    return applyDecorators(UseInterceptors(ResponseFileInterceptor));
}
