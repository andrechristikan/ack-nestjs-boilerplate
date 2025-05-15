import { AppBaseConfigRepositoryBase } from '@common/features/bases/base-config.repository';
import { Injectable } from '@nestjs/common';
import { InjectDatabaseModel } from 'src/common/database/decorators/database.decorator';
import { Model } from 'mongoose';
import { FeatureConfigDoc, FeatureConfigEntity } from 'src/common/features/repository/entities/feature-config.entity';

@Injectable()
export class FeatureConfigRepository extends AppBaseConfigRepositoryBase<FeatureConfigEntity, FeatureConfigDoc> {
  constructor(
    @InjectDatabaseModel(FeatureConfigEntity.name)
    private readonly appSettingModel: Model<FeatureConfigEntity>,
  ) {
    super(appSettingModel);
  }
}