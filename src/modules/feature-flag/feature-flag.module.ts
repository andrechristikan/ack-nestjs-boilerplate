import { FeatureFlagSharedModule } from '@modules/feature-flag/feature-flag.shared.module';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Module } from '@nestjs/common';

@Module({
    imports: [FeatureFlagSharedModule],
    exports: [FeatureFlagService],
    providers: [FeatureFlagService],
})
export class FeatureFlagModule {}
