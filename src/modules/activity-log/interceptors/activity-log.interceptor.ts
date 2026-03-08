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
    ActivityLogActionMetaKey,
    ActivityLogMetadataMetaKey,
} from '@modules/activity-log/constants/activity-log.constant';
import { EnumActivityLogAction, UserAgent } from '@prisma/client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Response } from 'express';
import { IResponseActivityLogReturn } from '@common/response/interfaces/response.interface';
import geoIp from 'geoip-lite';

/**
 * Interceptor that automatically logs user activities to the database.
 * Captures user actions, IP addresses, user agents, geolocation, and metadata for audit trail purposes.
 * Runs after successful response and asynchronously saves activity logs without blocking the response.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly activityRepository: ActivityLogRepository
    ) {}

    /**
     * Intercepts HTTP requests to log user activities after successful responses.
     * Extracts user info, IP address, user agent, geolocation, and action metadata from decorators.
     * Activity is saved asynchronously so it doesn't block the response.
     *
     * @param context - Execution context containing request/response information
     * @param next - The next handler in the chain
     * @returns Observable that emits the response with background activity logging
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
                        const userAgent = UAParser(
                            headers['user-agent']
                        ) as UserAgent;
                        const ipAddress = getClientIp(request);
                        const geo = ipAddress ? geoIp.lookup(ipAddress) : null;
                        const geoLocation =
                            geo && ipAddress
                                ? {
                                      latitude: geo.ll[0],
                                      longitude: geo.ll[1],
                                      country: geo.country,
                                      region: geo.region,
                                      city: geo.city,
                                  }
                                : null;

                        const action: EnumActivityLogAction =
                            this.reflector.get<EnumActivityLogAction>(
                                ActivityLogActionMetaKey,
                                context.getHandler()
                            );
                        const metadata: IActivityLogMetadata =
                            this.reflector.get<IActivityLogMetadata>(
                                ActivityLogMetadataMetaKey,
                                context.getHandler()
                            ) ?? {};

                        try {
                            await this.activityRepository.create(
                                userId,
                                action,
                                {
                                    ipAddress,
                                    userAgent,
                                    geoLocation,
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
