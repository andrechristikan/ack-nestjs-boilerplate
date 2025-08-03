import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
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
import { IResponse } from '@common/response/interfaces/response.interface';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '@common/helper/services/helper.service';
import { ENUM_APP_LANGUAGE } from '@app/enums/app.enum';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponseDto<T> | undefined>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    let messageProperties: IMessageOptionsProperties;

                    // set default response
                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: T = undefined;

                    // metadata
                    const today = this.helperService.dateCreate();
                    const xPath = request.path;
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
                    const metadata: ResponseMetadataDto = {
                        language: xLanguage,
                        timestamp: xTimestamp,
                        timezone: xTimezone,
                        path: xPath,
                        version: xVersion,
                        repoVersion: xRepoVersion,
                    };

                    // response
                    const responseData = (await res) as IResponse<T>;

                    if (responseData) {
                        const { _metadata } = responseData;

                        data = responseData.data;
                        httpStatus = _metadata?.httpStatus ?? httpStatus;
                        statusCode = _metadata?.statusCode ?? statusCode;
                        messagePath = _metadata?.messagePath ?? messagePath;
                        messageProperties = _metadata?.messageProperties;
                    }

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
