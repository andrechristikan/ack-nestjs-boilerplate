import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { DatabaseMongoRepositoryAbstract } from 'src/common/database/abstracts/database.mongo-repository.abstract';
import { DatabaseModel } from 'src/common/database/decorators/database.decorator';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { LoggerEntity } from 'src/common/logger/schemas/logger.schema';

@Injectable()
export class LoggerMongoRepository
    extends DatabaseMongoRepositoryAbstract<LoggerEntity>
    implements IDatabaseRepository<LoggerEntity>
{
    constructor(
        @DatabaseModel(LoggerEntity.name)
        private readonly loggerModel: Model<LoggerEntity>
    ) {
        super(loggerModel);
    }
}
