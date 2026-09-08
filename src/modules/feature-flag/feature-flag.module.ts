import { FeatureFlagRepositoryModule } from '@modules/feature-flag/feature-flag.repository.module';
import { FeatureFlagCacheService } from '@modules/feature-flag/services/feature-flag.cache.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Global, Module } from '@nestjs/common';

/** Global so the feature flag guard reaches the domain service and the cache helpers app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagService, FeatureFlagCacheService, FeatureFlagUtil],
    exports: [FeatureFlagService, FeatureFlagCacheService],
    imports: [FeatureFlagRepositoryModule],
})
export class FeatureFlagModule {}
