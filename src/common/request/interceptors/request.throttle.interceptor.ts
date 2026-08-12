import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import {
    RequestThrottleHandledStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import {
    IRequestApp,
    IRequestThrottleOptions,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleUtil } from '@common/request/utils/request.throttle.util';

/**
 * Enforces the per-user limiter for routes carrying `@RequestThrottle`.
 */
@Injectable()
export class RequestThrottleInterceptor implements NestInterceptor {
    private readonly name = 'user';
    private readonly policy: IRequestThrottlePolicy;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
        private readonly requestStoreService: RequestStoreService,
        private readonly requestThrottleUtil: RequestThrottleUtil
    ) {
        this.policy = this.configService.get<IRequestThrottlePolicy>(
            'request.throttle.user'
        )!;
    }

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<unknown>> {
        // NestJS mounts this interceptor once per `@RequestThrottle` on the handler, so a
        // handler carrying the decorator twice would count twice.
        if (
            this.requestStoreService.get<boolean>(
                RequestThrottleHandledStoreKey
            )
        ) {
            return next.handle();
        }

        this.requestStoreService.set<boolean>(
            RequestThrottleHandledStoreKey,
            true
        );

        const options = this.reflector.get<IRequestThrottleOptions | undefined>(
            RequestThrottleOptionsMetaKey,
            context.getHandler()
        );

        if (!options?.user) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const userId = request.user?.userId;
        if (!userId) {
            return next.handle();
        }

        const response = context.switchToHttp().getResponse<Response>();
        await this.requestThrottleUtil.evaluate(
            response,
            this.name,
            userId,
            this.policy
        );

        return next.handle();
    }
}
