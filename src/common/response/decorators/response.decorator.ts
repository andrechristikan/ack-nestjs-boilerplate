import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import { ResponseInterceptor } from '@common/response/interceptors/response.interceptor';
import { ResponsePagingInterceptor } from '@common/response/interceptors/response.paging.interceptor';
import { IResponseOptions } from '@common/response/interfaces/response.interface';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';
import { ResponseFileInterceptor } from '@common/response/interceptors/response.file.interceptor';

/**
 * Applies `ResponseInterceptor` to a route handler, standardizing the HTTP response format.
 *
 * The controller method must return `IResponseReturn<T>`. The interceptor resolves
 * the i18n message from `messagePath`, applies any `metadata` overrides from the
 * return value, and emits a `{ statusCode, message, metadata, data }` response.
 *
 * Optionally enables response caching via `@nestjs/cache-manager`.
 *
 * @param messagePath - i18n message path resolved by `MessageService` (e.g. `'user.get'`)
 * @param options - Optional cache configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Response('user.get')
 * @Get('/:id')
 * async getUser(): Promise<IResponseReturn<UserResponseDto>> {
 *     return { data: await this.userService.findById(id) };
 * }
 * ```
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
 * Applies `ResponsePagingInterceptor` to a route handler, standardizing the paginated HTTP response format.
 *
 * The controller method must return `IResponsePagingReturn<T>` (offset or cursor pagination result).
 * The interceptor validates the pagination shape, resolves the i18n message, and emits a
 * `{ statusCode, message, metadata, data }` response with full pagination metadata.
 *
 * Optionally enables response caching via `@nestjs/cache-manager`.
 *
 * @param messagePath - i18n message path resolved by `MessageService` (e.g. `'user.list'`)
 * @param options - Optional cache configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ResponsePaging('user.list')
 * @Get('/')
 * async list(pagination: IPaginationQueryOffsetParams): Promise<IResponsePagingReturn<UserListResponseDto>> {
 *     return this.paginationService.offset(this.userRepository, { ...pagination });
 * }
 * ```
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
 * Applies `ResponseFileInterceptor` to a route handler for file download responses.
 *
 * The controller method must return `IResponseFileReturn` (either `IResponseCsvReturn` or
 * `IResponsePdfReturn`). The interceptor converts the payload to a `StreamableFile` and
 * sets `Content-Type`, `Content-Disposition`, and `Content-Length` headers automatically.
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ResponseFile()
 * @Get('/export')
 * async export(): Promise<IResponseCsvReturn> {
 *     return { data: csv, extension: EnumFileExtensionDocument.csv };
 * }
 * ```
 */
export function ResponseFile(): MethodDecorator {
    return applyDecorators(UseInterceptors(ResponseFileInterceptor));
}
