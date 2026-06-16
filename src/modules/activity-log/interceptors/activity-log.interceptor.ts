import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UAParser } from 'ua-parser-js';
import { getClientIp } from '@supercharge/request-ip';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogActionMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { EnumActivityLogAction, UserAgent } from '@generated/prisma-client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import geoIp from 'geoip-lite';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { ActivityLogMetadataStoreService } from '@modules/activity-log/services/activity-log.metadata-store.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger(ActivityLogInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly activityLogMetadataStore: ActivityLogMetadataStoreService
    ) {}

    private async saveActivityLog(
        context: ExecutionContext,
        request: IRequestApp,
        payload: {
            rawError: unknown;
            metadataActivityLog: IActivityLogMetadata;
        }
    ): Promise<void> {
        const { headers, user } = request;
        const { metadataActivityLog, rawError } = payload;

        const { userId } = user!;
        const userAgent = UAParser(headers['user-agent']) as UserAgent;
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

        if (!action) {
            return;
        }

        try {
            let description = this.activityLogUtil.getDescription(
                action,
                metadataActivityLog
            );
            let error: {
                errorMessage?: string;
                errorStack?: string;
            } = {};
            if (rawError) {
                error = this.serializeError(rawError);
                description += ` - Error: ${error.errorMessage}`;
            }

            await this.activityRepository.create(
                userId,
                action,
                description,
                {
                    ipAddress,
                    userAgent,
                    geoLocation,
                },
                {
                    ...metadataActivityLog,
                    ...error,
                }
            );
        } catch (error: unknown) {
            this.logger.error(
                error,
                `Failed to save activity log for user ${userId} and action ${action}`
            );
        }
    }

    private serializeError(rawError: unknown): {
        errorMessage: string;
        errorStack?: string;
    } {
        if (rawError instanceof HttpException) {
            const response = rawError.getResponse();
            const errorMessage =
                typeof response === 'string'
                    ? response
                    : ((response as { message: string }).message ??
                      rawError.message);
            return {
                errorMessage,
                errorStack: rawError.stack,
            };
        } else if (rawError instanceof Error) {
            return {
                errorMessage: rawError.message,
                errorStack: rawError.stack,
            };
        } else if (typeof rawError === 'object' && rawError !== null) {
            return {
                errorMessage: JSON.stringify(rawError),
            };
        }

        return {
            errorMessage: String(rawError),
        };
    }

    private triggerLog(
        context: ExecutionContext,
        request: IRequestApp,
        rawError: unknown
    ): void {
        const { user } = request;
        if (!user) {
            return;
        }

        const metadataActivityLog = this.activityLogMetadataStore.getMetadata();

        // non blocking log saving
        this.saveActivityLog(context, request, {
            rawError,
            metadataActivityLog,
        }).catch(() => {});
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const ctx: HttpArgumentsHost = context.switchToHttp();
        const request: IRequestApp = ctx.getRequest<IRequestApp>();

        // tap runs on success only; catchError on the error path. Both needed.
        return next.handle().pipe(
            tap(() => this.triggerLog(context, request, null)),
            catchError((error: unknown) => {
                this.triggerLog(context, request, error);

                return throwError(() => error);
            })
        );
    }
}
