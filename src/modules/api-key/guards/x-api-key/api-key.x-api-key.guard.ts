import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

/**
 * Guard that validates the X-API-Key header authentication.
 * Extracts and validates the API key from request headers, then attaches the resolved `ApiKey` entity to `request.__apiKey`.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(private readonly apiKeyService: ApiKeyService) {}

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

        request.__apiKey = apiKey;

        return true;
    }
}
