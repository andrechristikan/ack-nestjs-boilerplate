import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [FeatureFlagService, FeatureFlagRepository, FeatureFlagUtil],
    providers: [FeatureFlagService, FeatureFlagRepository, FeatureFlagUtil],
})
export class FeatureFlagModule {}
