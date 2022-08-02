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
import { IMessage } from 'src/common/message/message.interface';
import { MessageService } from 'src/common/message/services/message.service';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_PATH_META_KEY } from '../constants/response.constant';

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
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const response: Response = ctx.getResponse();

                    const messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );

                    // message base on language
                    const { customLang } = ctx.getRequest<IRequestApp>();
                    const customLanguages = customLang
                        ? customLang.split(',')
                        : [];

                    // response
                    let resStatusCode = response.statusCode;
                    let resMessage: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages,
                        });
                    const resData = (await responseData) as IResponse;

                    if (resData) {
                        const { metadata, ...data } = resData;

                        // metadata
                        let resMetadata = {};
                        if (metadata) {
                            const { statusCode, message, ...metadataOthers } =
                                metadata;
                            resStatusCode = statusCode || resStatusCode;
                            resMessage = message
                                ? await this.messageService.get(message, {
                                      customLanguages,
                                  })
                                : resMessage;
                            resMetadata = metadataOthers;
                        }

                        return {
                            statusCode: resStatusCode,
                            message: resMessage,
                            metadata:
                                Object.keys(resMetadata).length > 0
                                    ? resMetadata
                                    : undefined,
                            data,
                        };
                    }

                    return {
                        statusCode: resStatusCode,
                        message: resMessage,
                    };
                })
            );
        }

        return next.handle();
    }
}
