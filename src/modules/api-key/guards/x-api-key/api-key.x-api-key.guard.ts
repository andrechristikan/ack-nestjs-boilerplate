import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { ApiKeyStoreKey } from '@modules/api-key/constants/api-key.constant';

/**
 * Guard that validates the X-API-Key header authentication.
 * Extracts and validates the API key from request headers, then stores the resolved `ApiKey` entity in the request store under `ApiKeyStoreKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    /**
     * Validates the X-API-Key header and attaches the API key to the request.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Resolves to true if the API key is valid and attached to the request
     * @throws {UnauthorizedException} If the X-API-Key header is missing or has an invalid format
     * @throws {ForbiddenException} If the API key is not found
     * @throws {UnauthorizedException} If the API key credentials are invalid or the key is inactive/expired
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const apiKey = await this.apiKeyService.validateXApiKeyGuard(request);

        this.requestStoreService.set(ApiKeyStoreKey, apiKey);

        return true;
    }
}
