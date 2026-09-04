import { FeatureFlagRepositoryModule } from '@modules/feature-flag/feature-flag.repository.module';
import { FeatureFlagUtilModule } from '@modules/feature-flag/feature-flag.util.module';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Global, Module } from '@nestjs/common';

/** Global so the feature flag guard reaches the domain service app-wide. */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagService],
    exports: [FeatureFlagService],
    imports: [FeatureFlagRepositoryModule, FeatureFlagUtilModule],
})
export class FeatureFlagModule {}
