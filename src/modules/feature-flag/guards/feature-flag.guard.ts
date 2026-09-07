import { IRequestApp } from '@common/request/interfaces/request.interface';
import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Denies the request unless the route's feature flag is active for the caller.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    private readonly anonymousHeaderName: string;
    private readonly anonymousIdMaxLength: number;
    private readonly anonymousIdPattern: RegExp;

    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.anonymousHeaderName = this.configService.get<string>(
            'featureFlag.anonymous.headerName'
        )!;
        this.anonymousIdMaxLength = this.configService.get<number>(
            'featureFlag.anonymous.idMaxLength'
        )!;
        this.anonymousIdPattern = this.configService.get<RegExp>(
            'featureFlag.anonymous.idPattern'
        )!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureFlagKeyPath = this.reflector.get<string>(
            FeatureFlagKeyPathMetaKey,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const rawAnonymousId = request.headers[this.anonymousHeaderName];
        const anonymousId =
            typeof rawAnonymousId !== 'string' ||
            rawAnonymousId.length === 0 ||
            rawAnonymousId.length > this.anonymousIdMaxLength ||
            !this.anonymousIdPattern.test(rawAnonymousId)
                ? null
                : rawAnonymousId;

        await this.featureFlagService.validateFeatureFlag(
            featureFlagKeyPath,
            request.user?.userId ?? null,
            anonymousId
        );

        return true;
    }
}
