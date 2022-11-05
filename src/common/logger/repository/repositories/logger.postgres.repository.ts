import { Injectable } from '@nestjs/common';
import { DatabasePostgresRepositoryAbstract } from 'src/common/database/abstracts/database.postgres-repository.abstract';
import { DatabasePostgresModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { LoggerPostgresEntity } from 'src/common/logger/repository/entities/logger.postgres.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LoggerPostgresRepository
    extends DatabasePostgresRepositoryAbstract<LoggerPostgresEntity>
    implements IDatabaseRepository<LoggerPostgresEntity>
{
    constructor(
        @DatabasePostgresModel(LoggerPostgresEntity)
        private readonly apiKeyModel: Repository<LoggerPostgresEntity>
    ) {
        super(apiKeyModel);
    }
}
