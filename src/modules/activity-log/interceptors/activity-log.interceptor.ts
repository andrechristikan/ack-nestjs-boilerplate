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
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import {
    ActivityLogActionMetaKey,
    ActivityLogMetadataStoreKey,
} from '@modules/activity-log/constants/activity-log.constant';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';

/**
 * Persists an activity log on both success and failure paths, non-blocking. Metadata comes from `RequestStoreService` under `ActivityLogMetadataStoreKey`; never logs secrets.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger(ActivityLogInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private async saveActivityLog(
        context: ExecutionContext,
        request: IRequestApp,
        payload: {
            rawError: unknown;
            metadataActivityLogStore: IActivityLogMetadata;
        }
    ): Promise<void> {
        const { user } = request;
        const { metadataActivityLogStore, rawError } = payload;

        const { userId } = user!;
        const {
            ipAddress,
            userAgent,
            geoLocation,
        } = this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
                metadataActivityLogStore
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
                    ...metadataActivityLogStore,
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

        const metadataActivityLogStore =
            this.requestStoreService.get<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey
            ) ?? {};

        // non blocking log saving
        this.saveActivityLog(context, request, {
            rawError,
            metadataActivityLogStore,
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
