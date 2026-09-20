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
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';

/**
 * Authorizes the request by matching the resolved API key type against the types required via `ApiKeyXTypeMetaKey`.
 * Must run after `ApiKeyXApiKeyGuard`.
 */
@Injectable()
export class ApiKeyXApiKeyTypeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly apiKeyDomain: ApiKeyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const apiKeyTypes: EnumApiKeyType[] = this.reflector.getAllAndOverride<
            EnumApiKeyType[]
        >(ApiKeyXTypeMetaKey, [context.getHandler(), context.getClass()]);

        const apiKey = this.requestStoreService.get<ApiKey>(ApiKeyStoreKey);
        return this.apiKeyDomain.validateXApiKeyTypeGuard(apiKey, apiKeyTypes);
    }
}
