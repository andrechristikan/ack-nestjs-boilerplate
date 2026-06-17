import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';

/**
 * Validates the X-API-Key header and stores the resolved `ApiKey` in the request store under `ApiKeyStoreKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const apiKey = await this.apiKeyService.validateXApiKeyGuard(request);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
