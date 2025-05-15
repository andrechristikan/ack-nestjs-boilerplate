import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { SchemaFactory } from '@nestjs/mongoose';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';


export const FeatureTableName = 'FeatureConfigs';


@DatabaseEntity({
  collection: FeatureTableName,
})

export class FeatureConfigEntity extends AppBaseConfigEntityBase {

}

export const FeatureConfigSchema = SchemaFactory.createForClass(FeatureConfigEntity);
export type FeatureConfigDoc = IDatabaseDocument<FeatureConfigEntity>;