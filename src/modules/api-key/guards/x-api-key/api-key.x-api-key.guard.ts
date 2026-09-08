import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Validates the X-API-Key header and stores the resolved `ApiKey` in the request store under `ApiKeyStoreKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    private readonly header: string;

    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService
    ) {
        this.header = this.configService.get<string>('auth.xApiKey.header')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const xApiKeyHeader =
            (request.headers[this.header.toLowerCase()] as string) ?? '';
        const apiKey = await this.apiKeyService.validateXApiKey(xApiKeyHeader);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
