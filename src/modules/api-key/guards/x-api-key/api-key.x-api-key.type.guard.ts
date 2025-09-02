import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { API_KEY_X_TYPE_META_KEY } from '@modules/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from '@prisma/client';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';

@Injectable()
export class ApiKeyXApiKeyTypeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly apiKeyUtil: ApiKeyUtil
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: ENUM_API_KEY_TYPE[] = this.reflector.getAllAndOverride<
            ENUM_API_KEY_TYPE[]
        >(API_KEY_X_TYPE_META_KEY, [context.getHandler(), context.getClass()]);

        if (!required) {
            return true;
        }

        const request = context.switchToHttp().getRequest<IRequestApp>();
        this.apiKeyUtil.validateXApiKeyType(request, required);

        return true;
    }
}
