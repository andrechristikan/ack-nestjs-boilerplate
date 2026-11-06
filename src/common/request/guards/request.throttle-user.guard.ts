import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IRequestApp,
    IRequestThrottleOptions,
    IRequestThrottlePolicy,
} from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';

@Injectable()
export class RequestThrottleUserGuard implements CanActivate {
    private readonly name = EnumRequestThrottleName.user;
    private readonly policy: IRequestThrottlePolicy;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService,
        private readonly requestThrottleService: RequestThrottleService
    ) {
        this.policy = this.configService.get<IRequestThrottlePolicy>(
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

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const userId = request.user?.userId ?? null;
        if (userId === null) {
            throw new RequestContextMissingException('request.user');
        }

        const response = context.switchToHttp().getResponse<Response>();
        await this.requestThrottleService.evaluate(
            response,
            this.name,
            userId,
            this.policy
        );

        return true;
    }
}
