import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ActivityLogActionMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';

/**
 * Triggers an activity log write on both success and failure paths, non-blocking.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly activityLogService: ActivityLogService
    ) {}

    private triggerLog(
        context: ExecutionContext,
        request: IRequestApp,
        rawError: unknown
    ): void {
        const { user } = request;
        if (!user) {
            return;
        }

        const action: EnumActivityLogAction =
            this.reflector.get<EnumActivityLogAction>(
                ActivityLogActionMetaKey,
                context.getHandler()
            );

        if (!action) {
            return;
        }

        // Not awaited: writing the log never delays the response.
        this.activityLogService
            .create(user.userId, action, rawError)
            .catch(() => {});
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const ctx = context.switchToHttp();
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
