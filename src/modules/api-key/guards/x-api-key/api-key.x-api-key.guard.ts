import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ApiKeyHeaderName,
    ApiKeyStoreKey,
} from '@modules/api-key/constants/api-key.constant';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKeyHeader =
            (request.headers[ApiKeyHeaderName] as string) ?? '';
        const apiKey = await this.apiKeyService.validateXApiKey(xApiKeyHeader);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
