import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyDomain } from '@modules/api-key/domains/api-key.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Validates the X-API-Key header and stores the resolved `ApiKey` in the request store under `ApiKeyStoreKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    private readonly header: string;

    constructor(
        private readonly apiKeyDomain: ApiKeyDomain,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService
    ) {
        this.header = this.configService.get<string>('auth.xApiKey.header')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const headerName = this.header.toLowerCase();
        const xApiKeyHeader = (request.headers[headerName] as string) ?? '';
        const apiKey = await this.apiKeyDomain.validateXApiKey(xApiKeyHeader);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
