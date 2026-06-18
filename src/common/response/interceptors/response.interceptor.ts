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
import { ResponseMessagePathMetaKey } from '@common/response/constants/response.constant';
import {
    ResponseDto,
    ResponseMetadataDto,
} from '@common/response/dtos/response.dto';
import { IMessageProperties } from '@common/message/interfaces/message.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';

/**
 * Wraps handler results into the standard `{ statusCode, message, metadata, data }` envelope,
 * localizing the message and setting custom headers.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponseDto<T>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    let messagePath: string = this.reflector.get<string>(
                        ResponseMessagePathMetaKey,
                        context.getHandler()
                    );
                    let messageProperties: IMessageProperties | undefined;

                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: T | undefined = undefined;

                    const metadata: ResponseMetadataDto =
                        this.responseMetadataService.create();

                    const responseData = (await res) as IResponseReturn<T>;
                    if (responseData) {
                        const { metadata: responseMetadata } = responseData;

                        data = responseData.data ?? undefined;
                        httpStatus = responseMetadata?.httpStatus ?? httpStatus;
                        statusCode = responseMetadata?.statusCode ?? statusCode;
                        messagePath =
                            responseMetadata?.messagePath ?? messagePath;
                        messageProperties = responseMetadata?.messageProperties;
                    }

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
                        metadata,
                        data,
                    };
                })
            );
        }

        return next.handle();
    }
}
