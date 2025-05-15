import { DynamicModule, Global, Module } from '@nestjs/common';
import { FeatureConfigRepositoryModule } from '@common/features/repository/feature-config.repository.module';
import { FeatureConfigService } from '@common/features/services/feature-config.service';

@Global()
@Module({})
export class FeatureConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: FeatureConfigModule,
      imports: [FeatureConfigRepositoryModule],
      providers: [
        FeatureConfigService,
      ],
      exports: [FeatureConfigService],
    };
  }
}
