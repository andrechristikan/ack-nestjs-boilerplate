import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UAParser } from 'ua-parser-js';
import { getClientIp } from '@supercharge/request-ip';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import {
    ACTIVITY_LOG_ACTION_META_KEY,
    ACTIVITY_LOG_METADATA_META_KEY,
} from '@modules/activity-log/constants/activity-log.constant';
import { ENUM_ACTIVITY_LOG_ACTION } from '@prisma/client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Response } from 'express';
import { IResponseActivityLogReturn } from '@common/response/interfaces/response.interface';

/**
 * Interceptor that automatically logs user activities to the database.
 * Captures user actions, IP addresses, user agents, and metadata for audit trail purposes.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly activityRepository: ActivityLogRepository
    ) {}

    /**
     * Intercepts HTTP requests to log user activities after successful responses.
     * Extracts user information, IP address, user agent, and action metadata to create activity log entries.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @param {CallHandler} next - The next handler in the chain
     * @returns {Observable<Promise<Response>>} Observable of the response with activity logging
     */
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Promise<Response>> {
        if (context.getType() === 'http') {
            return next.handle().pipe(
                tap(async (res: Promise<Response>) => {
                    const ctx: HttpArgumentsHost = context.switchToHttp();
                    const request: IRequestApp = ctx.getRequest<IRequestApp>();

                    const { headers, user } = request;
                    if (user) {
                        const responseData =
                            (await res) as IResponseActivityLogReturn;
                        let { metadataActivityLog } = responseData;
                        metadataActivityLog = metadataActivityLog ?? {};

                        const { userId } = user;
                        const userAgent = UAParser(headers['user-agent']);
                        const ipAddress = getClientIp(request);

                        const action: ENUM_ACTIVITY_LOG_ACTION =
                            this.reflector.get<ENUM_ACTIVITY_LOG_ACTION>(
                                ACTIVITY_LOG_ACTION_META_KEY,
                                context.getHandler()
                            );
                        const metadata: IActivityLogMetadata =
                            this.reflector.get<IActivityLogMetadata>(
                                ACTIVITY_LOG_METADATA_META_KEY,
                                context.getHandler()
                            ) ?? {};

                        try {
                            await this.activityRepository.create(
                                userId,
                                action,
                                {
                                    ipAddress,
                                    userAgent,
                                },
                                {
                                    ...metadata,
                                    ...metadataActivityLog,
                                }
                            );
                        } catch {}
                    }

                    return;
                })
            );
        }

        return next.handle();
    }
}
