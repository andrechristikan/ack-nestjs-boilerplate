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
import { IResponse, IResponseHttp } from '../response.interface';
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
    ): Promise<Observable<Promise<IResponseHttp>>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                map(async (responseData: Promise<Record<string, any>>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const responseExpress: Response = ctx.getResponse();

                    let messagePath: string = this.reflector.get<string>(
                        RESPONSE_MESSAGE_PATH_META_KEY,
                        context.getHandler()
                    );

                    // message base on language
                    const { customLang } = ctx.getRequest<IRequestApp>();

                    // response
                    const response = (await responseData) as IResponse;
                    const { metadata, ...data } = response;
                    let statusCode: number = responseExpress.statusCode;

                    if (metadata) {
                        statusCode = metadata.statusCode || statusCode;
                        messagePath = metadata.message || messagePath;

                        delete metadata.statusCode;
                        delete metadata.message;
                    }

                    // message
                    const message: string | IMessage =
                        await this.messageService.get(messagePath, {
                            customLanguages: customLang,
                        });

                    const responseHttp: IResponseHttp = {
                        statusCode,
                        message,
                        metadata,
                        data,
                    };
                    return responseHttp;
                })
            );
        }

        return next.handle();
    }
}
