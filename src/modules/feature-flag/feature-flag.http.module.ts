import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [FeatureFlagHttpService],
    exports: [FeatureFlagHttpService],
    imports: [],
})
export class FeatureFlagHttpModule {}
