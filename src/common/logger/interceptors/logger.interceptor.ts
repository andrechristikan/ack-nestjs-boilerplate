import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { LoggerService } from 'src/common/logger/services/logger.service';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import {
    LOGGER_ACTION_META_KEY,
    LOGGER_OPTIONS_META_KEY,
} from 'src/common/logger/constants/logger.constant';
import { ILoggerOptions } from 'src/common/logger/interfaces/logger.interface';

@Injectable()
export class LoggerInterceptor implements NestInterceptor<any> {
    constructor(
        private readonly reflector: Reflector,
        private readonly loggerService: LoggerService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<Promise<any> | string>> {
        if (context.getType() === 'http') {
            const ctx: HttpArgumentsHost = context.switchToHttp();
            const {
                apiKey,
                method,
                originalUrl,
                user,
                id,
                body,
                params,
                path,
            } = ctx.getRequest<IRequestApp>();
            const responseExpress = ctx.getResponse<Response>();

            return next.handle().pipe(
                tap(async (response: Promise<Record<string, any>>) => {
                    const responseData: Record<string, any> = await response;
                    const responseStatus: number = responseExpress.statusCode;
                    const statusCode =
                        responseData?.statusCode ?? responseStatus;

                    const loggerAction: ENUM_LOGGER_ACTION =
                        this.reflector.get<ENUM_LOGGER_ACTION>(
                            LOGGER_ACTION_META_KEY,
                            context.getHandler()
                        );
                    const loggerOptions: ILoggerOptions =
                        this.reflector.get<ILoggerOptions>(
                            LOGGER_OPTIONS_META_KEY,
                            context.getHandler()
                        );

                    await this.loggerService.raw({
                        level: loggerOptions?.level ?? ENUM_LOGGER_LEVEL.INFO,
                        action: loggerAction,
                        description:
                            loggerOptions?.description ??
                            `Request ${method} called, url ${originalUrl}, and action ${loggerAction}`,
                        apiKey: apiKey?._id,
                        user: user?._id,
                        requestId: id,
                        method: method as ENUM_REQUEST_METHOD,
                        role: user?.role,
                        accessFor: user?.accessFor,
                        params,
                        bodies: body,
                        path,
                        statusCode,
                        tags: loggerOptions?.tags ?? [],
                    });
                })
            );
        }

        return next.handle();
    }
}
