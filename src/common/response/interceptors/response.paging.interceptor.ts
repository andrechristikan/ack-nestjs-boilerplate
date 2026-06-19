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
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import {
    ResponsePagingDto,
    ResponsePagingMetadataDto,
} from '@common/response/dtos/response.paging.dto';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { IPaginationQuery } from '@common/pagination/interfaces/pagination.interface';

/**
 * Wraps paginated handler results into the standard envelope, merging pagination state from the
 * per-request store into the metadata and localizing the message.
 */
@Injectable()
export class ResponsePagingInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService,
        private readonly requestStoreService: RequestStoreService
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

                    let messagePath: string = this.reflector.get<string>(
                        ResponseMessagePathMetaKey,
                        context.getHandler()
                    );

                    let data: T[] = [];

                    const metadata = this.responseMetadataService.create();

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

                    const pagination =
                        this.requestStoreService.get<Partial<IPaginationQuery>>(
                            PaginationStoreKey
                        ) ?? {};
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

                    this.responseMetadataService.setHeaders(response, metadata);
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
}
