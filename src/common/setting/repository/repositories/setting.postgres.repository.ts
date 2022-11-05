import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { SettingPostgresEntity } from 'src/common/setting/repository/entities/setting.postgres.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingPostgresRepository
    extends DatabasePostgresRepositoryAbstract<SettingPostgresEntity>
    implements IDatabaseRepository<SettingPostgresEntity>
{
    constructor(
        @DatabasePostgresModel(SettingPostgresEntity)
        private readonly apiKeyModel: Repository<SettingPostgresEntity>
    ) {
        super(apiKeyModel);
    }
}
