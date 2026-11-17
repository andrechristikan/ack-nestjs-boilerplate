import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import {
    RequestActorStoreKey,
    RequestThrottleOptionsMetaKey,
} from '@common/request/constants/request.constant';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IRequestThrottleOptions,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';

@Injectable()
export class RequestThrottleUserGuard implements CanActivate {
    private readonly name = EnumRequestThrottleName.user;
    private readonly throttleUser: IRequestThrottlePolicy;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
        private readonly requestThrottleService: RequestThrottleService,
        private readonly requestStoreService: RequestStoreService
    ) {
        this.throttleUser = this.configService.get<IRequestThrottlePolicy>(
            'request.throttle.user'
        )!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.get<IRequestThrottleOptions | undefined>(
            RequestThrottleOptionsMetaKey,
            context.getHandler()
        );

        if (!options?.user) {
            return true;
        }

        const userId =
            this.requestStoreService.get<string>(RequestActorStoreKey);
        if (userId === null) {
            throw new RequestContextMissingException(RequestActorStoreKey);
        }

        const response = context.switchToHttp().getResponse<Response>();
        await this.requestThrottleService.evaluate(
            response,
            this.name,
            userId,
            this.throttleUser
        );

        return true;
    }
}
