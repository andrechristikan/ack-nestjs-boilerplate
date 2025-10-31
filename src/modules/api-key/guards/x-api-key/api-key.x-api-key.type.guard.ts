import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { API_KEY_X_TYPE_META_KEY } from '@modules/api-key/constants/api-key.constant';
import { ENUM_API_KEY_TYPE } from '@prisma/client';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

/**
 * Guard that validates API key type authorization.
 * Checks if the authenticated API key has the required type permissions for the requested resource.
 */
@Injectable()
export class ApiKeyXApiKeyTypeGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly apiKeyService: ApiKeyService
    ) {}

    /**
     * Validates that the API key type matches the required permissions.
     * Extracts required API key types from metadata and validates against the authenticated API key.
     *
     * @param {ExecutionContext} context - The execution context containing request information and metadata
     * @returns {Promise<boolean>} Promise that resolves to true if API key type is authorized
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const apiKeyTypes: ENUM_API_KEY_TYPE[] =
            this.reflector.getAllAndOverride<ENUM_API_KEY_TYPE[]>(
                API_KEY_X_TYPE_META_KEY,
                [context.getHandler(), context.getClass()]
            );

        const request = context.switchToHttp().getRequest<IRequestApp>();
        return this.apiKeyService.validateXApiKeyTypeGuard(
            request,
            apiKeyTypes
        );
    }
}
