import { DynamicModule, Global, Module } from '@nestjs/common';
import { FeatureConfigService } from 'src/common/features/services/feature-config.service';
import { FeatureConfigRepositoryModule } from 'src/common/features/repository/feature-config.repository.module';

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
