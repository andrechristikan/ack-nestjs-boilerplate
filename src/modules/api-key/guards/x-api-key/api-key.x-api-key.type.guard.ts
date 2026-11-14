import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ApiKeyContextStoreKey,
    ApiKeyXTypeMetaKey,
} from '@modules/api-key/constants/api-key.constant';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import { EnumApiKeyType } from '@generated/prisma-client/client';
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

        const apiKeyContext = this.requestStoreService.get<IApiKeyContext>(
            ApiKeyContextStoreKey
        );
        if (apiKeyContext === null) {
            throw new ApiKeyGuardMissingException();
        }

        return this.apiKeyService.validateXApiKeyTypeGuard(
            apiKeyContext.apiKey,
            apiKeyTypes
        );
    }
}
