import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import {
    IRequestApp,
    IRequestThrottleOptions,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestUtil } from '@common/request/utils/request.util';

/**
 * Enforces the per-route limiter of `@RequestThrottle` before any route-level guard runs.
 */
@Injectable()
export class RequestThrottleRouteGuard implements CanActivate {
    private readonly name = 'route';
    private readonly policies: Record<
        EnumRequestThrottleRoute,
        IRequestThrottlePolicy
    >;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
        private readonly requestUtil: RequestUtil,
        private readonly requestThrottleService: RequestThrottleService
    ) {
        this.policies = this.configService.get<
            Record<EnumRequestThrottleRoute, IRequestThrottlePolicy>
        >('request.throttle.route')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.get<IRequestThrottleOptions | undefined>(
            RequestThrottleOptionsMetaKey,
            context.getHandler()
        );

        if (!options?.route) {
            return true;
        }

        const policy = this.policies[options.route];
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const response = context.switchToHttp().getResponse<Response>();
        const ip = this.requestUtil.resolveThrottleTrackerIp(request);
        const tracker = `${options.route}:${context.getClass().name}.${context.getHandler().name}:${ip}`;

        await this.requestThrottleService.evaluate(
            response,
            this.name,
            tracker,
            policy
        );

        return true;
    }
}
