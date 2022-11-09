import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { LoggerEntity } from 'src/common/logger/repository/entities/logger.entity';

@Injectable()
export class LoggerRepository
    extends DatabaseMongoRepositoryAbstract<LoggerEntity>
    implements IDatabaseRepository<LoggerEntity>
{
    constructor(
        @DatabaseModel(LoggerEntity)
        private readonly loggerModel: Model<LoggerEntity>
    ) {
        super(loggerModel, {
            path: 'apiKey',
            match: '_id',
            model: ApiKeyEntity.name,
        });
    }
}
