import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import { EnumApiKeyType } from '@prisma/client';
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
        const apiKeyTypes: EnumApiKeyType[] = this.reflector.getAllAndOverride<
            EnumApiKeyType[]
        >(ApiKeyXTypeMetaKey, [context.getHandler(), context.getClass()]);

        const request = context.switchToHttp().getRequest<IRequestApp>();
        return this.apiKeyService.validateXApiKeyTypeGuard(
            request,
            apiKeyTypes
        );
    }
}
