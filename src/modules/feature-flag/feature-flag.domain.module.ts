import { FeatureFlagRepositoryModule } from '@modules/feature-flag/feature-flag.repository.module';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Global, Module } from '@nestjs/common';

/** Global so the feature flag guard reaches the domain service and the cache helpers app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagDomain, FeatureFlagCache, FeatureFlagUtil],
    exports: [FeatureFlagDomain, FeatureFlagCache],
    imports: [FeatureFlagRepositoryModule],
})
export class FeatureFlagDomainModule {}
