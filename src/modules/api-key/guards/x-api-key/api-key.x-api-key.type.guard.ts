import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey, ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKey, EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

/**
 * Authorizes the request by matching the resolved API key type against the types required via `ApiKeyXTypeMetaKey`.
 * Must run after `ApiKeyXApiKeyGuard`.
 */
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
        return this.apiKeyService.validateXApiKeyTypeGuard(apiKey, apiKeyTypes);
    }
}
