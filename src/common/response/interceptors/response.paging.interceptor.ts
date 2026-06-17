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
 * Wraps paginated handler results into the standard envelope, merging request pagination state
 * into the metadata and localizing the message.
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
     * Cursor type contributes `nextCursor`; offset type contributes page fields.
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
                    let hasPrevious: boolean = false;

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
                    const messageProperties: IMessageProperties | undefined =
                        rMetadata?.messageProperties;

                    if (rMetadata) {
                        delete rMetadata.httpStatus;
                        delete rMetadata.statusCode;
                        delete rMetadata.messagePath;
                        delete rMetadata.messageProperties;
                    }

                    const pagination = request.pagination ?? {};
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
                        search: pagination.search,
                        filters: pagination.filters,
                        orderBy: pagination.orderBy ?? [],
                        availableSearch: pagination.availableSearch ?? [],
                        availableOrderBy: pagination.availableOrderBy ?? [],
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

    private createPagingResponseMetadata(
        request: IRequestApp
    ): ResponsePagingMetadataDto {
        const today = this.helperService.dateCreate();
        const xLanguage: EnumMessageLanguage =
            (request.language as EnumMessageLanguage) ??
            this.configService.get<EnumMessageLanguage>('message.language')!;
        const xVersion =
            request.version ??
            this.configService.get<string>('app.urlVersion.version')!;

        return {
            language: xLanguage,
            timestamp: this.helperService.dateGetTimestamp(today),
            timezone: this.helperService.dateGetZone(today),
            path: request.path,
            version: xVersion,
            repoVersion: this.configService.get<string>('app.version')!,
            requestId: String(request.id),
            correlationId: String(request.correlationId),

            totalPage: 0,
            count: 0,
            search: undefined,
            filters: undefined,
            page: 0,
            perPage: 0,
            orderBy: [],
            availableSearch: [],
            availableOrderBy: [],
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
     * Asserts the result is a pagination shape with a valid `type` and an array `data`.
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
