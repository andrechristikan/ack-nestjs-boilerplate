import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { SettingEntity } from 'src/common/setting/schemas/setting.schema';
import { Repository } from 'typeorm';

@Injectable()
export class SettingPostgresRepository
    extends DatabasePostgresRepositoryAbstract<SettingEntity>
    implements IDatabaseRepository<SettingEntity>
{
    constructor(
        @DatabaseModel(SettingEntity.name)
        private readonly settingModel: Repository<SettingEntity>
    ) {
        super(settingModel);
    }
}
