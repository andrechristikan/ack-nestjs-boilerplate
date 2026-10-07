import { HttpStatus, Injectable } from '@nestjs/common';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { MessageService } from '@common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import {
    ResponseMessagePathMetaKey,
    ResponseSchemaMetaKey,
} from '@common/response/constants/response.constant';
import type { ResponseDto } from '@common/response/dtos/response.dto';
import type { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ResponseMetadataService } from '@common/response/services/response.metadata.service';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';

/**
 * Wraps handler results into the standard `{ statusCode, message, metadata, data }` envelope,
 * serializing the payload against the route's declared schema, localizing the message and
 * setting custom headers.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService,
        private readonly responseMetadataService: ResponseMetadataService
    ) {}

    /**
     * A payload without a declared schema is a route that promised no data, so it fails closed.
     */
    private async serialize(
        schema: StandardSchemaV1 | null,
        payload: unknown
    ): Promise<T> {
        if (!schema) {
            throw new ResponseSerializationException();
        }

        const result = await schema['~standard'].validate(payload);
        if (result.issues) {
            throw new ResponseSerializationException({
                rawError: result.issues,
            });
        }

        return result.value as T;
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<ResponseDto<T>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (res: Promise<Response>) => {
                    const ctx = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    let messagePath: string = this.reflector.get<string>(
                        ResponseMessagePathMetaKey,
                        context.getHandler()
                    );
                    const reflectedSchema = this.reflector.get<
                        StandardSchemaV1 | undefined
                    >(ResponseSchemaMetaKey, context.getHandler());
                    const schema = reflectedSchema ?? null;

                    let httpStatus: HttpStatus = response.statusCode;
                    let statusCode: number = response.statusCode;
                    let data: T | null = null;

                    const metadata: ResponseMetadataDto =
                        this.responseMetadataService.create();

                    const responseData = (await res) as IResponseReturn<T>;
                    const responseMetadata = responseData?.metadata;
                    if (responseData) {
                        const payload = responseData.data ?? null;
                        if (payload !== null) {
                            data = await this.serialize(schema, payload);
                        }
                        httpStatus = responseMetadata?.httpStatus ?? httpStatus;
                        statusCode = responseMetadata?.statusCode ?? statusCode;
                        messagePath =
                            responseMetadata?.messagePath ?? messagePath;
                    }

                    const messageProperties =
                        responseMetadata?.messageProperties ?? null;
                    const message: string = this.messageService.setMessage(
                        messagePath,
                        {
                            customLanguage: metadata.language,
                            ...(messageProperties !== null && {
                                properties: messageProperties,
                            }),
                        }
                    );

                    this.responseMetadataService.setHeaders(response, metadata);
                    response.status(httpStatus);

                    return {
                        statusCode,
                        message,
                        metadata,
                        ...(data !== null && { data }),
                    };
                })
            );
        }

        return next.handle();
    }
}
