import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { FeatureFlagRepository } from '@modules/feature-flag/repositories/feature-flag.repository';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';

/** Shared module: FeatureFlagService for the feature-flag guard and the user, workspace, and mfa services' own-flag asserts and numeric reads. */
@Global()
@Module({})
export class FeatureFlagModule {
    static forRoot(): DynamicModule {
        return {
            module: FeatureFlagModule,
            controllers: [],
            providers: [
                FeatureFlagRepository,
                FeatureFlagService,
                FeatureFlagCache,
            ],
            exports: [FeatureFlagService, FeatureFlagCache],
            imports: [],
        };
    }
}
