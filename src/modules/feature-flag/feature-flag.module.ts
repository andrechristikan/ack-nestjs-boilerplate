import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { DynamicModule, Global, Module } from '@nestjs/common';

@Global()
@Module({})
export class FeatureFlagModule {
    static forRoot(): DynamicModule {
        return {
            module: FeatureFlagModule,
            imports: [],
            exports: [
                FeatureFlagService,
                FeatureFlagRepository,
                FeatureFlagUtil,
            ],
            providers: [
                FeatureFlagService,
                FeatureFlagRepository,
                FeatureFlagUtil,
            ],
        };
    }
}
