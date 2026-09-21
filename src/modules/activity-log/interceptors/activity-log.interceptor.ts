import { Injectable, Logger } from '@nestjs/common';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

/**
 * Flushes staged activity-log events after the handler settles.
 * Success flushes every staged event; error flushes only `onError: true` events.
 * A flush failure never changes the handler outcome.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ActivityLogInterceptor.name);

    constructor(private readonly activityLogDomain: ActivityLogDomain) {}

    private async flushSafe(
        payloadUserId: string | null,
        isError: boolean
    ): Promise<void> {
        try {
            await this.activityLogDomain.flushStaged({
                payloadUserId,
                isError,
            });
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to flush staged activity logs');
        }
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const payloadUserId = request.user?.userId ?? null;

        return next.handle().pipe(
            concatMap(async result => {
                await this.flushSafe(payloadUserId, false);
                return result;
            }),
            catchError((error: unknown) =>
                from(
                    (async () => {
                        await this.flushSafe(payloadUserId, true);
                        throw error;
                    })()
                ).pipe(catchError((err: unknown) => throwError(() => err)))
            )
        );
    }
}
