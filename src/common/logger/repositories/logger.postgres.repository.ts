import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { LoggerEntity } from 'src/common/logger/schemas/logger.schema';
import { Repository } from 'typeorm';

@Injectable()
export class LoggerPostgresRepository
    extends DatabasePostgresRepositoryAbstract<LoggerEntity>
    implements IDatabaseRepository<LoggerEntity>
{
    constructor(
        @DatabaseModel(LoggerEntity.name)
        private readonly loggerModel: Repository<LoggerEntity>
    ) {
        super(loggerModel);
    }
}
