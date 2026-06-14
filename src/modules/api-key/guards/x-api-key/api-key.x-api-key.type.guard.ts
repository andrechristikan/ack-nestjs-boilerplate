import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ApiKeyXTypeMetaKey } from '@modules/api-key/constants/api-key.constant';
import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';

/**
 * Guard that validates API key type authorization.
 * Checks if the authenticated API key's type matches the required types defined via `SetMetadata`.
 * Must run after `ApiKeyXApiKeyGuard` has attached the API key to the request.
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
     * @returns {boolean} True if the API key type is authorized
     * @throws {InternalServerErrorException} If no API key types are defined in route metadata
     * @throws {ForbiddenException} If the API key type does not match the required types
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
