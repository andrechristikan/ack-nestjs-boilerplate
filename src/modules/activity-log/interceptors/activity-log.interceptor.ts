import { HttpException, Injectable, Logger } from '@nestjs/common';
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ActivityLogInterceptor.name);

    constructor(private readonly activityLogService: ActivityLogService) {}

    private async flushSafe(payloadUserId: string | null): Promise<void> {
        try {
            await this.activityLogService.flushStaged({ payloadUserId });
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
                await this.flushSafe(payloadUserId);
                return result;
            }),
            catchError((error: unknown) =>
                from(
                    (async () => {
                        await this.flushSafe(payloadUserId);

                        if (
                            error instanceof AppBaseException ||
                            error instanceof HttpException
                        ) {
                            throw error;
                        }

                        throw new AppUnknownException(error);
                    })()
                ).pipe(catchError((err: unknown) => throwError(() => err)))
            )
        );
    }
}
