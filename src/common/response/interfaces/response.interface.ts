import { HttpStatus } from '@nestjs/common';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
} from '@common/pagination/interfaces/pagination.interface';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Optional metadata returned from a controller to override the default response behavior.
 * Any field set here takes precedence over the values resolved by the interceptor.
 */
export interface IResponseMetadata {
    /** Custom status code to include in the response body (overrides HTTP status). */
    statusCode?: number;
    /** HTTP status code to send in the response (overrides default). */
    httpStatus?: HttpStatus;
    /** i18n message path to use instead of the decorator-defined path. */
    messagePath?: string;
    /** Interpolation properties for the i18n message. */
    messageProperties?: IMessageProperties;
}

/**
 * Cache configuration options for `@Response` and `@ResponsePaging` decorators.
 */
export interface IResponseCacheOptions {
    /** Custom cache key. Defaults to the route path when omitted. */
    key?: string;
    /** Cache TTL in milliseconds. Uses the global default when omitted. */
    ttl?: number;
}

/**
 * Mixin shape for controller return values that include activity log metadata.
 * When combined with `@ActivityLog`, place `@ActivityLog` above `@Response`
 * so the activity log interceptor can read this field before the response is normalized.
 */
export interface IResponseActivityLogReturn {
    metadataActivityLog?: IActivityLogMetadata;
}

/**
 * Options accepted by the `@Response` and `@ResponsePaging` decorators.
 */
export interface IResponseOptions {
    /**
     * Enable response caching.
     * - `true` — use defaults (path as key, global TTL)
     * - `IResponseCacheOptions` — provide a custom key and/or TTL
     */
    cache?: IResponseCacheOptions | boolean;
}

/**
 * Shape of the value a controller method must return when decorated with `@Response`.
 *
 * @template T - Type of the response payload.
 *
 * @example
 * ```typescript
 * async getUser(): Promise<IResponseReturn<UserResponseDto>> {
 *     return {
 *         data: await this.userService.findById(id),
 *         metadata: { statusCode: EnumUserStatusCodeError.notFound },
 *     };
 * }
 * ```
 */
export interface IResponseReturn<
    T = unknown,
> extends IResponseActivityLogReturn {
    /** Optional overrides applied by `ResponseInterceptor` before sending the response. */
    metadata?: IResponseMetadata;
    /** The response payload serialized into the `data` field. */
    data?: T;
}

/**
 * Shape of the value a controller method must return when decorated with `@ResponsePaging`.
 * Accepts either an offset or cursor pagination result enriched with optional response metadata
 * and activity log metadata.
 *
 * @template T - Type of the individual items in the paginated `data` array.
 *
 * @example
 * ```typescript
 * async list(pagination: IPaginationQueryOffsetParams): Promise<IResponsePagingReturn<UserListResponseDto>> {
 *     return this.paginationService.offset(this.userRepository, { ...pagination });
 * }
 * ```
 */
export type IResponsePagingReturn<T> = (
    | IPaginationOffsetReturn<T>
    | IPaginationCursorReturn<T>
) & {
    /** Optional overrides applied by `ResponsePagingInterceptor` before sending the response. */
    metadata?: IResponseMetadata;
} & IResponseActivityLogReturn;

/**
 * Shape of the value a controller method must return when serving a CSV file download
 * via `@ResponseFile`.
 */
export interface IResponseCsvReturn extends IResponseActivityLogReturn {
    /** CSV content as a UTF-8 string. */
    data: string;
    extension: EnumFileExtensionDocument.csv;
    /** Optional custom filename for the `Content-Disposition` header. */
    filename?: string;
}

/**
 * Shape of the value a controller method must return when serving a PDF file download
 * via `@ResponseFile`.
 */
export interface IResponsePdfReturn extends IResponseActivityLogReturn {
    /** PDF content as a binary Buffer. */
    data: Buffer;
    extension: EnumFileExtensionDocument.pdf;
    /** Optional custom filename for the `Content-Disposition` header. */
    filename?: string;
}

/**
 * Union type for the value returned by a controller method decorated with `@ResponseFile`.
 * Must be either a CSV or PDF return shape.
 */
export type IResponseFileReturn = IResponseCsvReturn | IResponsePdfReturn;
