import type { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    FeatureFlagAnonymousIdHeaderName,
    FeatureFlagKeyPathMetaKey,
} from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Denies the request unless the route's feature flag is active for the caller.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
    private readonly anonymousIdMaxLength: number;
    private readonly anonymousIdRegex: RegExp;

    constructor(
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.anonymousIdMaxLength = this.configService.get<number>(
            'featureFlag.anonymous.idMaxLength'
        )!;
        this.anonymousIdRegex = this.configService.get<RegExp>(
            'featureFlag.anonymous.idRegex'
        )!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const featureFlagKeyPath = this.reflector.get<string>(
            FeatureFlagKeyPathMetaKey,
            context.getHandler()
        );

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const rawAnonymousId =
            request.headers[FeatureFlagAnonymousIdHeaderName];
        let anonymousId: string | null = null;
        if (
            typeof rawAnonymousId === 'string' &&
            rawAnonymousId.length > 0 &&
            rawAnonymousId.length <= this.anonymousIdMaxLength
        ) {
            const isAnonymousIdValid =
                this.anonymousIdRegex.test(rawAnonymousId);
            if (isAnonymousIdValid) {
                anonymousId = rawAnonymousId;
            }
        }

        await this.featureFlagDomain.validateFeatureFlag(
            featureFlagKeyPath,
            request.user?.userId ?? null,
            anonymousId
        );

        return true;
    }
}
