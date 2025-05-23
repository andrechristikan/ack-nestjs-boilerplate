import { InjectDatabaseModel } from '@app/common/database/decorators/database.decorator';
import { AppBaseConfigRepositoryBase } from '@common/features/bases/base-config.repository';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { FeatureConfigDoc, FeatureConfigEntity } from '@common/features/repository/entities/feature-config.entity';

@Injectable()
export class FeatureConfigRepository extends AppBaseConfigRepositoryBase<FeatureConfigEntity, FeatureConfigDoc> {
  constructor(
    @InjectDatabaseModel(FeatureConfigEntity.name)
    private readonly appSettingModel: Model<FeatureConfigEntity>,
  ) {
    super(appSettingModel);
  }
}