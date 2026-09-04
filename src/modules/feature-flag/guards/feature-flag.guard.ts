import { IRequestApp } from '@common/request/interfaces/request.interface';
import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Denies the request unless the route's feature flag is active for the caller.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly featureFlagUtil: FeatureFlagUtil,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureFlagKeyPath = this.reflector.get<string>(
            FeatureFlagKeyPathMetaKey,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const anonymousId = this.featureFlagUtil.resolveAnonymousId(request);

        await this.featureFlagService.validateFeatureFlag(
            featureFlagKeyPath,
            request.user?.userId ?? null,
            anonymousId
        );

        return true;
    }
}
