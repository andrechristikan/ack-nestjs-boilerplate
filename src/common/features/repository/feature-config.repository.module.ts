import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureConfigRepository } from '@common/features/repository/repositories/feature-config-repository.service';
import { FeatureConfigEntity, FeatureConfigSchema } from '@common/features/repository/entities/feature-config.entity';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';

@Module({
  providers: [
    FeatureConfigRepository,
  ],
  exports: [
    FeatureConfigRepository,
  ],
  controllers: [],
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: FeatureConfigEntity.name,
          schema: FeatureConfigSchema,
        },
      ],
      DATABASE_CONNECTION_NAME,
    ),
  ],
})
export class FeatureConfigRepositoryModule {

}