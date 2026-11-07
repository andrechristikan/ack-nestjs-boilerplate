import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ApiKeyStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ApiKeyGuardMissingException } from '@modules/api-key/exceptions/api-key.guard-missing.exception';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

@Injectable()
export class ApiKeyXApiKeyTypeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly apiKeyService: ApiKeyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const apiKeyTypes: EnumApiKeyType[] = this.reflector.getAllAndOverride<
            EnumApiKeyType[]
        >(ApiKeyXTypeMetaKey, [context.getHandler(), context.getClass()]);

        const apiKey = this.requestStoreService.get<ApiKey>(ApiKeyStoreKey);
        if (!apiKey) {
            throw new ApiKeyGuardMissingException();
        }

        return this.apiKeyService.validateXApiKeyTypeGuard(apiKey, apiKeyTypes);
    }
}
