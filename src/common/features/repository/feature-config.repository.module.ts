import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { FeatureConfigRepository } from 'src/common/features/repository/repositories/feature-config-repository.service';
import {
  FeatureConfigEntity,
  FeatureConfigSchema,
} from 'src/common/features/repository/entities/feature-config.entity';

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