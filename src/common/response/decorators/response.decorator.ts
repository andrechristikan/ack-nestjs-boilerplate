import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { RESPONSE_MESSAGE_PATH_META_KEY } from '@common/response/constants/response.constant';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePagingInterceptor } from '@common/response/interceptors/response.paging.interceptor';
import { IResponseOptions } from '@common/response/interfaces/response.interface';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';

/**
 * Decorator for standard API responses with optional caching
 * @param {string} messagePath - Path to response message
 * @param {IResponseOptions} [options] - Response configuration options
 * @returns {MethodDecorator}
 */
export function Response(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponseInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
    ];

    if (options?.cached) {
        decorators.push(UseInterceptors(CacheInterceptor));

        if (typeof options?.cached !== 'boolean') {
            if (options?.cached?.key) {
                decorators.push(CacheKey(options?.cached?.key));
            }

            if (options?.cached?.ttl) {
                decorators.push(CacheTTL(options?.cached?.ttl));
            }
        }
    }

    return applyDecorators(...decorators);
}

/**
 * Decorator for paginated API responses with optional caching
 * @param {string} messagePath - Path to response message
 * @param {IResponseOptions} [options] - Response configuration options
 * @returns {MethodDecorator}
 */
export function ResponsePaging(
    messagePath: string,
    options?: IResponseOptions
): MethodDecorator {
    const decorators = [
        UseInterceptors(ResponsePagingInterceptor),
        SetMetadata(RESPONSE_MESSAGE_PATH_META_KEY, messagePath),
    ];

    if (options?.cached) {
        decorators.push(UseInterceptors(CacheInterceptor));

        if (typeof options?.cached !== 'boolean') {
            if (options?.cached?.key) {
                decorators.push(CacheKey(options?.cached?.key));
            }

            if (options?.cached?.ttl) {
                decorators.push(CacheTTL(options?.cached?.ttl));
            }
        }
    }

    return applyDecorators(...decorators);
}

/**
 * Decorator for file download responses
 * @returns {MethodDecorator}
 */
export function ResponseFile(): MethodDecorator {
    return applyDecorators(UseInterceptors(ResponseFileInterceptor));
}
