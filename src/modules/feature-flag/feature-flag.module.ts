import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Global, Module } from '@nestjs/common';

/** Shared module: FeatureFlagService for the feature-flag guard, the use cases, and the workspace services' own-flag asserts. */
@Global()
@Module({
    controllers: [],
    providers: [
        FeatureFlagRepository,
        FeatureFlagService,
        FeatureFlagCache,
        FeatureFlagUtil,
    ],
    exports: [FeatureFlagService, FeatureFlagCache],
    imports: [],
})
export class FeatureFlagModule {}
