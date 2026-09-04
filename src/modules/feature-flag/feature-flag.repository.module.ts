import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { Global, Module } from '@nestjs/common';

/**
 * Global so feature flag persistence is reachable from any module context.
 */
@Global()
@Module({
    controllers: [],
    providers: [FeatureFlagRepository],
    exports: [FeatureFlagRepository],
    imports: [],
})
export class FeatureFlagRepositoryModule {}
