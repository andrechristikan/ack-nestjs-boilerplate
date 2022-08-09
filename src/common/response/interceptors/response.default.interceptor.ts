import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { IResponse } from '../response.interface';
import { IRequestApp } from 'src/common/request/request.interface';
import { IMessageOptionsProperties } from 'src/common/message/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import {
    RESPONSE_MESSAGE_PATH_META_KEY,
    RESPONSE_SERIALIZATION_META_KEY,
    RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
    RESPONSE_SERIALIZATION_PROPERTIES_META_KEY,
} from '../constants/response.constant';
import {
    ClassConstructor,
    ClassTransformOptions,
    plainToInstance,
} from 'class-transformer';
import { ResponseDefaultDto } from '../dtos/response.default.dto';

@Injectable()
export class ResponseDefaultInterceptor
    implements NestInterceptor<Promise<any>>
{
    constructor(
        private readonly reflector: Reflector,
        private readonly messageService: MessageService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<ResponseDefaultDto>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const responseExpress: Response = ctx.getResponse();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );
                    const classSerialization: ClassConstructor<any> =
                        this.reflector.get<ClassConstructor<any>>(
                            RESPONSE_SERIALIZATION_META_KEY,
                            context.getHandler()
                        );
                    const classSerializationOptions: ClassTransformOptions =
                        this.reflector.get<ClassTransformOptions>(
                            RESPONSE_SERIALIZATION_OPTIONS_META_KEY,
                            context.getHandler()
                        );
                    const classSerializationProperties: IMessageOptionsProperties =
                        this.reflector.get<IMessageOptionsProperties>(
                            RESPONSE_SERIALIZATION_PROPERTIES_META_KEY,
                            context.getHandler()
                        );

                    // message base on language
                    const { customLang } = ctx.getRequest<IRequestApp>();

                    // default response
                    let statusCode: number = responseExpress.statusCode;
                    let message = await this.messageService.get(messagePath, {
                        customLanguages: customLang,
                    });

                    // response
                    const response = (await responseData) as IResponse;
                    if (response) {
                        const { metadata, ...data } = response;
                        let properties: IMessageOptionsProperties =
                            classSerializationProperties;
                        let serialization = data;

                        if (classSerialization) {
                            serialization = plainToInstance(
                                classSerialization,
                                data,
                                classSerializationOptions
                            );
                        }

                        if (metadata) {
                            statusCode = metadata.statusCode || statusCode;
                            messagePath = metadata.message || messagePath;
                            properties = metadata.properties || properties;

                            delete metadata.statusCode;
                            delete metadata.message;
                            delete metadata.properties;
                        }

                        // message
                        message = await this.messageService.get(messagePath, {
                            customLanguages: customLang,
                            properties,
                        });

                        return {
                            statusCode,
                            message,
                            metadata:
                                metadata && Object.keys(metadata).length > 0
                                    ? metadata
                                    : undefined,
                            data:
                                serialization &&
                                Object.keys(serialization).length > 0
                                    ? serialization
                                    : undefined,
                        };
                    }

                    return {
                        statusCode,
                        message,
                    };
                })
            );
        }

        return next.handle();
    }
}
