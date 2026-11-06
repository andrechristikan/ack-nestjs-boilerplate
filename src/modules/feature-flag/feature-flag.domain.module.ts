import { FeatureFlagRepositoryModule } from '@modules/feature-flag/feature-flag.repository.module';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Global, Module } from '@nestjs/common';

/** Shared module: FeatureFlagDomain for the feature-flag guard, the HTTP services, and the workspace domain's own-flag asserts. */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagDomain, FeatureFlagCache, FeatureFlagUtil],
    exports: [FeatureFlagDomain, FeatureFlagCache],
    imports: [FeatureFlagRepositoryModule],
})
export class FeatureFlagDomainModule {}
