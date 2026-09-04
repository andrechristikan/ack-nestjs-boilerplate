import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Validates the X-API-Key header and stores the resolved `ApiKey` in the request store under `ApiKeyStoreKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiKeyUtil: ApiKeyUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKeyHeader = this.apiKeyUtil.extractKeyFromRequest(request);
        const apiKey = await this.apiKeyService.validateXApiKey(xApiKeyHeader);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
