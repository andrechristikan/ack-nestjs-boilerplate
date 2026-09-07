import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [FeatureFlagRepository],
    exports: [FeatureFlagRepository],
    imports: [],
})
export class FeatureFlagRepositoryModule {}
