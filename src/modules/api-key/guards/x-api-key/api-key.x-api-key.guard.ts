import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

/**
 * Guard that validates X-API-Key header authentication.
 * Extracts and validates the API key from request headers and attaches it to the request object.
 */
@Injectable()
export class ApiKeyXApiKeyGuard implements CanActivate {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    /**
     * Validates the X-API-Key header and attaches the API key to the request.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if API key is valid
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const apiKey = await this.apiKeyService.validateXApiKeyGuard(request);

        request.__apiKey = apiKey;

        return true;
    }
}
