import { FEATURE_FLAG_IS_ACTIVE_META_KEY } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureFlagKey = this.reflector.get<string>(
            FEATURE_FLAG_IS_ACTIVE_META_KEY,
            context.getHandler()
        );

        await this.featureFlagService.validateFeatureFlagGuard(featureFlagKey);

        return true;
    }
}
