import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { MessageService } from '@common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import {
    ResponsePagingDto,
    ResponsePagingMetadataDto,
} from '@common/response/dtos/response.paging.dto';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';

/**
 * Global pagination response interceptor that standardizes paginated HTTP response format
 * across the entire application.
 *
 * This interceptor transforms all paginated HTTP responses into a consistent format
 * with metadata, pagination information, status codes, messages, and standardized headers.
 * It handles pagination data validation, response data transformation, message localization,
 * and adds custom headers for client-side processing.
 *
 * @template T - The type of the paginated response data items
 */
@Injectable()
export class ResponsePagingInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    /**
     * Intercepts HTTP requests and transforms paginated responses into standardized format.
     *
     * This method only processes HTTP contexts, ignoring other types like WebSocket
     * or RPC contexts. It validates pagination data, extracts response metadata,
     * applies localization, sets custom headers, and returns a consistent paginated
     * response structure with pagination information.
     *
     * **Pagination Type Handling:**
     * - For **CURSOR** type: Extracts `cursor` field for next page navigation
     * - For **OFFSET** type: Extracts `page`, `totalPage`, `nextPage`, `previousPage`, and `hasPrevious` fields
     *
     * @param context - The execution context containing request/response information
     * @param next - The next handler in the chain
     * @returns Observable of the transformed paginated response promise
     * @throws Error when response data is not properly formatted for pagination
     * @throws Error when type is not 'offset' or 'cursor'
     * @throws Error when data field is not an array
     */
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponsePagingDto<T>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        ResponseMessagePathMetaKey,
                        context.getHandler()
                    );

                    let data: T[] = [];

                    const metadata: ResponsePagingMetadataDto =
                        this.createPagingResponseMetadata(request);

                    const responseData =
                        (await res) as unknown as IResponsePagingReturn<T>;
                    this.validatePaginationResponse(responseData);

                    const {
                        metadata: rMetadata,
                        data: rData,
                        count,
                        hasNext,
                        perPage,
                        type,
                    } = responseData;

                    let nextCursor: string | undefined;
                    let previousCursor: string | undefined;

                    let totalPage: number | undefined;
                    let nextPage: number | undefined;
                    let previousPage: number | undefined;
                    let page: number | undefined;
                    let hasPrevious: boolean | undefined;

                    if (responseData.type === 'cursor') {
                        nextCursor = responseData.cursor;
                    } else if (responseData.type === 'offset') {
                        totalPage = responseData.totalPage;
                        nextPage = responseData.nextPage;
                        previousPage = responseData.previousPage;
                        page = responseData.page;
                        hasPrevious = responseData.hasPrevious;
                    }

                    data = rData;
                    messagePath = rMetadata?.messagePath ?? messagePath;

                    const httpStatus =
                        rMetadata?.httpStatus ?? response.statusCode;
                    const statusCode =
                        rMetadata?.statusCode ?? response.statusCode;
                    const messageProperties: IMessageProperties =
                        rMetadata?.messageProperties;

                    if (rMetadata) {
                        delete rMetadata.httpStatus;
                        delete rMetadata.statusCode;
                        delete rMetadata.messagePath;
                        delete rMetadata.messageProperties;
                    }

                    const finalMetadata: ResponsePagingMetadataDto = {
                        ...metadata,
                        type,
                        count,
                        hasNext,
                        hasPrevious,
                        totalPage,
                        nextCursor,
                        previousCursor,
                        nextPage,
                        previousPage,
                        page,
                        perPage,
                        search: request.__pagination.search,
                        filters: request.__pagination.filters,
                        orderBy: request.__pagination.orderBy,
                        orderDirection: request.__pagination.orderDirection,
                        availableSearch: request.__pagination.availableSearch,
                        availableOrderBy: request.__pagination.availableOrderBy,
                    };

                    const message: string = this.messageService.setMessage(
                        messagePath,
                        {
                            customLanguage: metadata.language,
                            properties: messageProperties,
                        }
                    );

                    this.setResponseHeaders(response, metadata);
                    response.status(httpStatus);

                    return {
                        statusCode,
                        message,
                        metadata: finalMetadata,
                        data,
                    };
                })
            );
        }

        return next.handle();
    }

    /**
     * Creates standardized pagination response metadata from request information.
     *
     * Initializes pagination metadata with default values including:
     * - Request tracking information (language, timestamp, timezone, path, version, IDs)
     * - Pagination defaults (type: OFFSET, page: 0, perPage: 0, count: 0)
     * - Search and filter defaults (undefined)
     * - Navigation flags (hasNext: false, hasPrevious: false)
     *
     * @param request - The incoming HTTP request
     * @returns ResponsePagingMetadataDto containing base metadata for the response with default OFFSET type
     */
    private createPagingResponseMetadata(
        request: IRequestApp
    ): ResponsePagingMetadataDto {
        const today = this.helperService.dateCreate();
        const xLanguage: EnumMessageLanguage =
            (request.__language as EnumMessageLanguage) ??
            this.configService.get<EnumMessageLanguage>('message.language');
        const xVersion =
            request.__version ??
            this.configService.get<string>('app.urlVersion.version');

        return {
            language: xLanguage,
            timestamp: this.helperService.dateGetTimestamp(today),
            timezone: this.helperService.dateGetZone(today),
            path: request.path,
            version: xVersion,
            repoVersion: this.configService.get<string>('app.version'),
            requestId: String(request.id),
            correlationId: String(request.correlationId),

            totalPage: 0,
            count: 0,
            search: undefined,
            filters: undefined,
            page: 0,
            perPage: 0,
            orderBy: undefined,
            orderDirection: undefined,
            availableSearch: undefined,
            availableOrderBy: undefined,
            nextPage: undefined,
            previousPage: undefined,
            hasNext: false,
            hasPrevious: false,
            nextCursor: undefined,
            previousCursor: undefined,
            type: EnumPaginationType.offset,
        };
    }

    /**
     * Validates the pagination response data structure.
     *
     * **Validations:**
     * - Response data must be an instance of IResponsePaging
     * - Type field must be either 'offset' or 'cursor'
     * - Data field must be an array and cannot be empty
     *
     * @param responseData - The response data to validate
     * @throws Error when response data is not properly formatted for pagination
     * @throws Error when type is not 'offset' or 'cursor'
     * @throws Error when data field is not an array
     */
    private validatePaginationResponse(
        responseData: IResponsePagingReturn<T>
    ): void {
        if (!responseData) {
            throw new Error('ResponsePaging must instanceof IResponsePaging');
        }

        if (
            responseData.type !== EnumPaginationType.offset &&
            responseData.type !== EnumPaginationType.cursor
        ) {
            throw new Error('Field type must be cursor or offset');
        }

        if (!responseData.data || !Array.isArray(responseData.data)) {
            throw new Error('Field data must in array and can not be empty');
        }
    }

    /**
     * Sets custom headers on the HTTP response.
     *
     * Adds standardized headers including language, timestamp, timezone,
     * version information, and request ID for client-side processing
     * and request correlation.
     *
     * @param response - The HTTP response object
     * @param metadata - Response metadata containing header values
     */
    private setResponseHeaders(
        response: Response,
        metadata: ResponsePagingMetadataDto
    ): void {
        response.setHeader('x-custom-lang', metadata.language);
        response.setHeader('x-timestamp', metadata.timestamp);
        response.setHeader('x-timezone', metadata.timezone);
        response.setHeader('x-version', metadata.version);
        response.setHeader('x-repo-version', metadata.repoVersion);
        response.setHeader('x-request-id', String(metadata.requestId));
        response.setHeader('x-correlation-id', String(metadata.correlationId));
    }
}
