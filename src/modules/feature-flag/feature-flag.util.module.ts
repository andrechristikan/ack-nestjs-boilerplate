import { FeatureFlagRepositoryModule } from '@modules/feature-flag/feature-flag.repository.module';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Global, Module } from '@nestjs/common';

/**
 * Global so the flag cache helpers are reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagUtil],
    exports: [FeatureFlagUtil],
    imports: [FeatureFlagRepositoryModule],
})
export class FeatureFlagUtilModule {}
