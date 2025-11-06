import { FEATURE_FLAG_KEY_PATH_META_KEY } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard that validates feature flag activation status.
 * Checks if the required feature flag is active before allowing access to protected routes.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly reflector: Reflector
    ) {}

    /**
     * Validates if the feature flag is active for the requested resource.
     * Extracts the feature flag key from metadata and validates its status.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if feature flag is active
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureFlagKeyPath = this.reflector.get<string>(
            FEATURE_FLAG_KEY_PATH_META_KEY,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest();
        await this.featureFlagService.validateFeatureFlagGuard(
            request,
            featureFlagKeyPath
        );

        return true;
    }
}
