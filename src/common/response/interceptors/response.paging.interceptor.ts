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
import { IMessageOptionsProperties } from '@common/message/interfaces/message.interface';
import { RESPONSE_MESSAGE_PATH_META_KEY } from '@common/response/constants/response.constant';
import { IResponsePaging } from '@common/response/interfaces/response.interface';
import {
    ResponsePagingDto,
    ResponsePagingMetadataDto,
} from '@common/response/dtos/response.paging.dto';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { ENUM_APP_LANGUAGE } from '@app/enums/app.enum';

@Injectable()
export class ResponsePagingInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponsePagingDto<T>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response & IResponsePaging<T>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );

                    let data: T[] = [];

                    // metadata
                    const today = this.helperService.dateCreate();
                    const xPath = request.path;
                    const xPagination = request.__pagination;
                    const xLanguage: string =
                        request.__language ??
                        this.configService.get<ENUM_APP_LANGUAGE>(
                            'message.language'
                        );
                    const xTimestamp =
                        this.helperService.dateGetTimestamp(today);
                    const xTimezone = this.helperService.dateGetZone(today);
                    const xVersion =
                        request.__version ??
                        this.configService.get<string>(
                            'app.urlVersion.version'
                        );
                    const xRepoVersion =
                        this.configService.get<string>('app.version');

                    // response
                    const responseData = (await res) as Response &
                        IResponsePaging<T>;
                    if (!responseData) {
                        throw new Error(
                            'ResponsePaging must instanceof IResponsePaging'
                        );
                    } else if (
                        !responseData.data ||
                        !Array.isArray(responseData.data)
                    ) {
                        throw new Error(
                            'Field data must in array and can not be empty'
                        );
                    }

                    const { _metadata, totalPage, count } = responseData;

                    data = responseData.data;

                    messagePath = _metadata?.messagePath ?? messagePath;
                    const httpStatus =
                        _metadata?.httpStatus ?? response.statusCode;
                    const statusCode =
                        _metadata?.statusCode ?? response.statusCode;
                    const messageProperties: IMessageOptionsProperties =
                        _metadata?.messageProperties;

                    delete _metadata?.httpStatus;
                    delete _metadata?.statusCode;
                    delete _metadata?.messagePath;
                    delete _metadata?.messageProperties;

                    const metadata: ResponsePagingMetadataDto = {
                        language: xLanguage,
                        timestamp: xTimestamp,
                        timezone: xTimezone,
                        path: xPath,
                        version: xVersion,
                        repoVersion: xRepoVersion,
                        totalPage,
                        count,
                        search: xPagination.search,
                        filters: xPagination.filters,
                        page: xPagination.page,
                        perPage: xPagination.perPage,
                        orderBy: xPagination.orderBy,
                        orderDirection: xPagination.orderDirection,
                        availableSearch: xPagination.availableSearch,
                        availableOrderBy: xPagination.availableOrderBy,
                        availableOrderDirection:
                            xPagination.availableOrderDirection,
                        ..._metadata,
                    };

                    const message: string = this.messageService.setMessage(
                        messagePath,
                        {
                            customLanguage: xLanguage,
                            properties: messageProperties,
                        }
                    );

                    response.setHeader('x-custom-lang', xLanguage);
                    response.setHeader('x-timestamp', xTimestamp);
                    response.setHeader('x-timezone', xTimezone);
                    response.setHeader('x-version', xVersion);
                    response.setHeader('x-repo-version', xRepoVersion);
                    response.status(httpStatus);

                    return {
                        statusCode,
                        message,
                        _metadata: metadata,
                        data,
                    };
                })
            );
        }

        return next.handle();
    }
}
