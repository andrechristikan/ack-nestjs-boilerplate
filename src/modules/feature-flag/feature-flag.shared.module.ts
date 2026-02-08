import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { Module } from '@nestjs/common';

@Module({
    imports: [],
    exports: [FeatureFlagRepository, FeatureFlagUtil],
    providers: [FeatureFlagRepository, FeatureFlagUtil],
})
export class FeatureFlagSharedModule {}
